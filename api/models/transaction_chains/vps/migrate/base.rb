module TransactionChains
  class Vps::Migrate::Base < ::TransactionChain
    urgent_rollback

    has_hook :pre_start,
        desc: 'Called before the VPS is started on the new node',
        context: 'TransactionChains::Vps::Migrate instance',
        args: {
          vps: 'destination Vps',
          running: 'true if the VPS was running before the migration'
        }
    has_hook :post_start,
        desc: 'Called after the VPS was started on the new node',
        context: 'TransactionChains::Vps::Migrate instance',
        args: {
          vps: 'destination Vps',
          running: 'true if the VPS was running before the migration'
        }

    # @param opts [Hash]
    # @option opts [Boolean] replace_ips (false)
    # @option opts [Hash] resources (nil)
    # @option opts [Boolean] handle_ips (true)
    # @option opts [Boolean] reallocate_ips (true)
    # @option opts [Symbol] swap (:enforce)
    # @option opts [Boolean] maintenance_window (true)
    # @option opts [Boolean] send_mail (true)
    # @option opts [String] reason (nil)
    # @option opts [Boolean] cleanup_data (true) destroy datasets on the source node
    def link_chain(vps, dst_node, opts = {})
      raise NotImplementedError
    end

    protected
    attr_reader :opts, :vps_user, :src_node, :dst_node, :src_pool, :dst_pool,
      :src_vps, :dst_vps, :datasets, :resources_changes
    attr_accessor :userns_map

    def setup(vps, dst_node, opts)
      @opts = set_hash_opts(opts, {
        replace_ips: false,
        transfer_ips: false,
        resources: nil,
        handle_ips: true,
        reallocate_ips: true,
        swap: :enforce,
        maintenance_window: true,
        send_mail: true,
        reason: nil,
        cleanup_data: true,
      })

      lock(vps)
      lock(vps.dataset_in_pool)
      concerns(:affect, [vps.class.name, vps.id])

      @vps_user = vps.user
      @src_vps = vps
      @dst_vps = ::Vps.find(vps.id)
      @dst_vps.node = dst_node

      check_snapshot_clone_mounts!

      @src_node = vps.node
      @dst_node = dst_node

      @was_running = vps.running?

      @src_pool = vps.dataset_in_pool.pool
      @dst_pool = dst_node.pools.hypervisor.take!

      @datasets = []

      vps.dataset_in_pool.dataset.subtree.arrange.each do |k, v|
        @datasets.concat(recursive_serialize(k, v))
      end

      @dst_vps.dataset_in_pool = @datasets.first[1]
      @resources_changes = {}
    end

    def was_running?
      @was_running
    end

    def location_changed?
      src_node.location_id != dst_node.location_id
    end

    def environment_changed?
      src_node.location.environment_id != dst_node.location.environment_id
    end

    def check_swap!
      if opts[:swap] == :enforce && src_vps.swap > 0 && dst_node.total_swap == 0
        raise VpsAdmin::API::Exceptions::OperationNotSupported,
              "VPS has #{src_vps.swap}MiB of swap, which is not available "+
              "on #{dst_node.domain_name}"
      end
    end

    # Check that local snapshots of the migrated VPS are not mounted anywere
    #
    # Snapshots are always mounted using clones, but that poses a problem. Since
    # the VPS is migrated to another node, we would have to recreate the clones
    # on the target node and remove clones from the source node. Removing clones
    # is not reliable and it could cause the migration to fail when cleaning up,
    # i.e. during the worst possible time after the VPS is already running on
    # the target node. Therefore we do not allow migrations of VPS with existing
    # snapshot clones.
    def check_snapshot_clone_mounts!
      ds_ids = [src_vps.dataset_in_pool.dataset_id] + src_vps.dataset_in_pool.dataset.descendant_ids
      dip_ids = ::DatasetInPool.where(
        dataset_id: ds_ids,
        pool_id: src_vps.dataset_in_pool.pool_id,
      ).pluck(:id)

      clones = ::SnapshotInPoolClone.joins(:snapshot_in_pool).where(
        snapshot_in_pools: {dataset_in_pool_id: dip_ids}
      )

      if clones.any?
        raise VpsAdmin::API::Exceptions::OperationNotSupported,
              'unable to migrate VPS with existing snapshot clones'
      end
    end

    def notify_begun
      mail(:vps_migration_begun, {
        user: vps_user,
        vars: {
          vps: src_vps,
          src_node: src_vps.node,
          dst_node: dst_vps.node,
          maintenance_window: opts[:maintenance_window],
          reason: opts[:reason],
        }
      }) if opts[:send_mail] && vps_user.mailer_enabled
    end

    def notify_finished
      mail(:vps_migration_finished, {
        user: vps_user,
        vars: {
          vps: src_vps,
          src_node: src_vps.node,
          dst_node: dst_vps.node,
          maintenance_window: opts[:maintenance_window],
          reason: opts[:reason],
        }
      }) if opts[:send_mail] && vps_user.mailer_enabled
    end

    def transfer_cluster_resources
      if environment_changed?
        resources_changes.update(src_vps.transfer_resources_to_env!(
          vps_user,
          dst_node.location.environment,
          opts[:resources]
        ))
      end
    end

    def recursive_serialize(dataset, children)
      ret = []

      # First parents
      dip = dataset.dataset_in_pools.where(pool: src_pool).take
      return ret unless dip

      lock(dip)

      dst = ::DatasetInPool.create!(
        pool: dst_pool,
        dataset_id: dip.dataset_id,
        label: dip.label,
        min_snapshots: dip.min_snapshots,
        max_snapshots: dip.max_snapshots,
        snapshot_max_age: dip.snapshot_max_age,
        user_namespace_map: userns_map,
      )

      lock(dst)

      ret << [dip, dst]

      # Then children
      children.each do |k, v|
        if v.is_a?(::Dataset)
          dip = v.dataset_in_pools.where(pool: src_pool).take
          next unless dip

          lock(dip)

          dst = ::DatasetInPool.create!(
            pool: dst_pool,
            dataset_id: dip.dataset_id,
            label: dip.label,
            min_snapshots: dip.min_snapshots,
            max_snapshots: dip.max_snapshots,
            snapshot_max_age: dip.snapshot_max_age,
            user_namespace_map: userns_map,
          )

          lock(dst)

          ret << [dip, dst]

        else
          ret.concat(recursive_serialize(k, v))
        end
      end

      ret
    end

    def migrate_dataset_plans(src_dip, dst_dip, confirmable)
      plans = []

      src_dip.dataset_in_pool_plans.includes(
        environment_dataset_plan: [:dataset_plan]
      ).each do |dip_plan|
        plans << dip_plan
      end

      return if plans.empty?

      plans.each do |dip_plan|
        plan = dip_plan.environment_dataset_plan.dataset_plan
        name = plan.name.to_sym

        # Remove src dip from the plan
        VpsAdmin::API::DatasetPlans.plans[name].unregister(
          src_dip,
          confirmation: confirmable
        )

        # Do not add the plan in the target environment if it is for admins only
        begin
          next unless ::EnvironmentDatasetPlan.find_by!(
            dataset_plan: plan,
            environment: dst_dip.pool.node.location.environment,
          ).user_add

        rescue ActiveRecord::RecordNotFound
          next  # the plan is not present in the target environment
        end

        begin
          VpsAdmin::API::DatasetPlans.plans[name].register(
            dst_dip,
            confirmation: confirmable
          )

        rescue VpsAdmin::API::Exceptions::DatasetPlanNotInEnvironment
          # This exception should never be raised, as the not-existing plan
          # in the target environment is caught by the rescue above.
          next
        end
      end
    end

    # Replaces IP addresses if migrating to another location. Handles reallocation
    # of cluster resources when migrating to a different environment.
    #
    # 1) Within one location
    #    - nothing to do but generate VPS config
    # 2) Different location, same env
    #    - no reallocation needed, just find replacement ips
    # 3) Different location, different env
    #    - find replacements, reallocate to different env
    def migrate_network_interfaces
      return unless opts[:handle_ips]

      if src_node.vpsadminos? && dst_node.vpsadminos?
        append(Transactions::Vps::PopulateConfig, args: dst_vps, urgent: true)
      end

      if src_vps.network_interfaces.count > 1
        raise VpsAdmin::API::Exceptions::VpsMigrationError,
              'migration of VPS with multiple network interfaces is not implemented'
      end

      if opts[:transfer_ips]
        if src_node.location_id == dst_node.location_id
          raise VpsAdmin::API::Exceptions::VpsMigrationError,
                'cannot transfer IP addresses within the same location'
        elsif src_node.location.environment_id == dst_node.location.environment_id
          raise VpsAdmin::API::Exceptions::VpsMigrationError,
                'cannot transfer IP addresses within the same environment'
        end

        src_vps.network_interfaces.each do |netif|
          recharge_ip_addresses(
            dst_vps.user,
            netif.ip_addresses.to_a,
            src_node.location,
            dst_node.location,
          )
        end
      elsif src_node.location != dst_node.location
        src_vps.network_interfaces.each do |netif|
          migrate_ip_addresses(netif)
        end
      end
    end

    def migrate_ip_addresses(netif)
      dst_netif = ::NetworkInterface.find(netif.id)
      dst_netif.vps = dst_vps

      # Add the same number of IP addresses from the target location
      if opts[:replace_ips]
        dst_ip_addresses = []

        netif.ip_addresses.joins(:network).order(
          'networks.ip_version, ip_addresses.order'
        ).each do |ip|
          begin
            replacement = ::IpAddress.pick_addr!(
              user: dst_vps.user,
              location: dst_vps.node.location,
              ip_v: ip.network.ip_version,
              role: ip.network.role.to_sym,
              purpose: ip.network.purpose.to_sym,
            )

          rescue ActiveRecord::RecordNotFound
            dst_ip_addresses << [ip, nil]
            next
          end

          lock(replacement)

          dst_ip_addresses << [ip, replacement]
        end

        if dst_ip_addresses.detect { |v| v[1].nil? }
          src = dst_ip_addresses.map { |v| v[0] }
          dst = dst_ip_addresses.map { |v| v[1] }.compact
          errors = []

          %i(ipv4 ipv4_private ipv6).each do |r|
            diff = filter_ip_addresses(src, r).count - filter_ip_addresses(dst, r).count
            next if diff == 0

            errors << "#{diff} #{r} addresses"
          end

          fail "Not enough free IP addresses in the target location: #{errors.join(', ')}"
        end

        # Migrating to a different environment, transfer IP cluster resources
        if opts[:reallocate_ips] && environment_changed?
          changes = transfer_ip_addresses(
            vps_user,
            dst_ip_addresses,
            src_node.location.environment,
            dst_node.location.environment,
          )

          unless changes.empty?
            append_t(Transactions::Utils::NoOp, args: find_node_id, urgent: true) do |t|
              changes.each { |obj, change| t.edit(obj, change) }
            end
          end
        end

        all_src_host_addrs = []
        all_dst_host_addrs = []

        dst_ip_addresses.each do |src_ip, dst_ip|
          src_host_addrs = src_ip.host_ip_addresses.where.not(order: nil).to_a
          all_src_host_addrs.concat(src_host_addrs.map { |addr| [addr, dst_ip] })

          dst_host_addrs = dst_ip.host_ip_addresses.where(order: nil).to_a
          all_dst_host_addrs.concat(dst_host_addrs)

          # Remove old addresses on the target node
          remove_confirmation = Proc.new do |t|
            t.edit(src_ip, network_interface_id: nil)
            t.edit(src_ip, user_id: nil) if src_ip.user_id
            t.edit(src_ip, charged_environment_id: nil)

            src_host_addrs.each do |host_addr|
              t.edit(host_addr, order: nil)
            end
          end

          if src_node.hypervisor_type == dst_node.hypervisor_type
            # When migrating between the same hypervisor types (OpenVZ && OpenVZ
            # or vpsAdminOS && vpsAdminOS), the original IP addresses were
            # transfered to the destination node, so we really have to remove
            # them.
            src_host_addrs.each do |host_addr|
              append_t(
                Transactions::NetworkInterface::DelHostIp,
                args: [dst_netif, host_addr]
              ) do |t|
                t.edit(host_addr, order: nil)
              end
            end

            append_t(
              Transactions::NetworkInterface::DelRoute,
              args: [dst_netif, src_ip, false],
              urgent: true,
              &remove_confirmation
            )
          else
            # When migrating to a different hypervisor type, the VPS is setup
            # from scratch and does not have the original IP addresses configured.
            # We can remove them just from the database.
            append_t(
              Transactions::Utils::NoOp,
              args: find_node_id,
              &remove_confirmation
            )
          end

          # Add new addresses on the target node
          append_t(
            Transactions::NetworkInterface::AddRoute,
            args: [dst_netif, dst_ip],
            urgent: true,
          ) do |t|
            t.edit(
              dst_ip,
              network_interface_id: dst_netif.id,
              order: src_ip.order,
              charged_environment_id: dst_node.location.environment_id,
            )

            if !dst_ip.user_id && dst_node.location.environment.user_ip_ownership
              t.edit(dst_ip, user_id: dst_vps.user_id)
            end
          end
        end

        # Sort src host addresses by order
        all_src_host_addrs.sort! { |a, b| a[0].order <=> b[0].order }

        # Add host addresses in the correct order
        all_src_host_addrs.each_with_index do |arr, i|
          src_addr, dst_ip = arr

          # Find target host address
          dst_addr = all_dst_host_addrs.detect do |addr|
            addr.ip_address_id == dst_ip.id
          end

          next if dst_addr.nil?
          all_dst_host_addrs.delete(dst_addr)

          append_t(
            Transactions::NetworkInterface::AddHostIp,
            args: [dst_netif, dst_addr],
            urgent: true,
          ) do |t|
            t.edit(dst_addr, order: i)
          end
        end

      else
        # Remove all IP addresses
        dst_ip_addresses = []
        ips = []

        netif.ip_addresses.each { |ip| ips << ip }
        use_chain(
          NetworkInterface::DelRoute,
          args: [
            dst_netif,
            ips,
            unregister: false,
            reallocate: opts[:reallocate_ips],
            phony: src_node.hypervisor_type != dst_node.hypervisor_type,
            environment: netif.vps.node.location.environment,
          ],
          urgent: true
        )
      end
    end

    # Transfer number of `ips` belonging to `user` from `src_env` to `dst_env`.
    #
    # TODO: this method will not properly work when the VPS has multiple
    # network interfaces. The resource reallocation needs to take into account
    # previous runs of this method -- one for each interface.
    def transfer_ip_addresses(user, ips, src_env, dst_env)
      ret = {}

      src_user_env = user.environment_user_configs.find_by!(
        environment: src_env,
      )
      dst_user_env = user.environment_user_configs.find_by!(
        environment: dst_env,
      )

      new_ips = ips.select { |_, ip| !ip.user_id }.map { |v| v[1] }

      %i(ipv4 ipv4_private ipv6).each do |r|
        # Free only standalone IP addresses
        standalone_ips = ips.map { |v| v[0] }

        src_use = src_user_env.reallocate_resource!(
          r,
          src_user_env.send(r) - filter_sum_ip_addresses(standalone_ips, r),
          user: user,
          confirmed: ::ClusterResourceUse.confirmed(:confirmed),
        )

        # Allocate all _new_ IP addresses
        dst_use = dst_user_env.reallocate_resource!(
          r,
          dst_user_env.send(r) + filter_sum_ip_addresses(new_ips, r),
          user: user,
          confirmed: ::ClusterResourceUse.confirmed(:confirmed),
        )

        ret[src_use] = {value: src_use.value}
        ret[dst_use] = {value: dst_use.value}
      end

      ret
    end

    # If all ips are available in both locations and the locations are in
    # different environments, free all addresses in the source environment
    # and charge them in the target environment.
    def recharge_ip_addresses(user, ips, src_loc, dst_loc)
      changes = {}

      # Check that all addresses are available in both locations
      ips.each do |ip|
        if !ip.is_in_environment?(dst_loc.environment)
          raise VpsAdmin::API::Exceptions::VpsMigrationError,
                "IP #{ip} is not available in the target environment "+
                "(#{dst_loc.environment.label})"
        end
      end

      src_env = src_loc.environment
      dst_env = dst_loc.environment

      src_user_env = user.environment_user_configs.find_by!(environment: src_env)
      dst_user_env = user.environment_user_configs.find_by!(environment: dst_env)

      %i(ipv4 ipv4_private ipv6).each do |r|
        # Free addresses from src env
        src_use = src_user_env.reallocate_resource!(
          r,
          src_user_env.send(r) - filter_sum_ip_addresses(ips, r),
          user: user,
          confirmed: ::ClusterResourceUse.confirmed(:confirmed),
        )

        # Allocate in dst env
        dst_use = dst_user_env.reallocate_resource!(
          r,
          dst_user_env.send(r) + filter_sum_ip_addresses(ips, r),
          user: user,
          confirmed: ::ClusterResourceUse.confirmed(:confirmed),
        )

        changes[src_use] = {value: src_use.value}
        changes[dst_use] = {value: dst_use.value}
      end

      if changes.any?
        append_t(Transactions::Utils::NoOp, args: find_node_id) do |t|
          changes.each { |obj, change| t.edit(obj, change) }

          ips.each do |ip|
            ip_changes = {
              charged_environment_id: dst_loc.environment_id,
            }

            if ip.user_id \
               && src_env.user_ip_ownership && !dst_env.user_ip_ownership
              ip_changes[:user_id] = nil
            elsif ip.user_id.nil? \
                  && !src_env.user_ip_ownership && dst_env.user_ip_ownership
              ip_changes[:user_id] = user.id
            end

            t.edit(ip, ip_changes)
          end
        end
      end
    end

    def filter_ip_addresses(ips, r)
      case r
      when :ipv4
        ips.select do |ip|
          ip.network.ip_version == 4 && ip.network.role == 'public_access'
        end

      when :ipv4_private
        ips.select do |ip|
          ip.network.ip_version == 4 && ip.network.role == 'private_access'
        end

      when :ipv6
        ips.select { |ip| ip.network.ip_version == 6 }
      end
    end

    def filter_sum_ip_addresses(ips, r)
      filter_ip_addresses(ips, r).inject(0) { |acc, ip| acc + ip.size }
    end

    def migrate_features
      return if src_node.hypervisor_type == dst_node.hypervisor_type

      to_keep = {}
      to_create = []
      to_remove = []

      src_vps.vps_features.each do |f|
        name = f.name.to_sym

        if VpsFeature::FEATURES[name].support?(dst_node)
          to_keep[name] = f
        else
          to_remove << f
        end
      end

      VpsFeature::FEATURES.each do |name, f|
        next if !f.support?(dst_node) || to_keep.has_key?(name)

        to_create << ::VpsFeature.create!(
          vps: dst_vps,
          name: name,
          enabled: false,
        )
      end

      append_t(Transactions::Vps::Features, args: [
        dst_vps,
        to_keep.values + to_create
      ], urgent: true) do |t|
        to_remove.each { |f| t.just_destroy(f) }
        to_create.each { |f| t.just_create(f) }
      end
    end
  end
end
