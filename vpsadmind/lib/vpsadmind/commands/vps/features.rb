module VpsAdmind
  class Commands::Vps::Features < Commands::Base
    handle 8001
    needs :system, :vz, :vps

    def exec
      set_features('enabled')
    end

    def rollback
      set_features('original')
    end

    protected
    def set_features(key)
      honor_state do
        vzctl(:stop, @vps_id)

        opts = {
            :features => [],
            :capability => [],
            :netfilter => 'stateless',
            :numiptent => '1000',
            :devices => []
        }

        if @features['bridge'][key]
          opts[:features] << 'bridge:on'
        else
          opts[:features] << 'bridge:off'
        end

        if @features['iptables'][key]
          opts[:netfilter] = 'full'
        end

        if @features['nfs'][key]
          opts[:features] << 'nfsd:on' << 'nfs:on'
        else
          opts[:features] << 'nfsd:off' << 'nfs:off'
        end

        if @features['tun'][key]
          opts[:capability] << 'net_admin:on'
          opts[:devices] << 'c:10:200:rw'
        else
          opts[:capability] << 'net_admin:off'
          opts[:devices] << 'c:10:200:none'
        end

        if @features['fuse'][key]
          opts[:devices] << 'c:10:229:rw'
        else
          opts[:devices] << 'c:10:229:none'
        end

        if @features['ppp'][key]
          opts[:features] << 'ppp:on'
          opts[:devices] << 'c:108:0:rw'
        else
          opts[:features] << 'ppp:off'
          opts[:devices] << 'c:108:0:none'
        end

        if @features['kvm'][key]
          opts[:devices] << 'c:10:232:rw'
        else
          opts[:devices] << 'c:10:232:none'
        end

        vzctl(:set, @vps_id, opts, true)

        vzctl(:start, @vps_id)
        sleep(3)

        if @features['tun'][key]
          vzctl(:exec, @vps_id, 'mkdir -p /dev/net')
          vzctl(:exec, @vps_id, 'mknod /dev/net/tun c 10 200', false, [8,])
          vzctl(:exec, @vps_id, 'chmod 600 /dev/net/tun')
        end

        if @features['fuse'][key]
          vzctl(:exec, @vps_id, 'mknod /dev/fuse c 10 229', false, [8,])
        end

        if @features['ppp'][key]
          vzctl(:exec, @vps_id, 'mknod /dev/ppp c 108 0', false, [8,])
          vzctl(:exec, @vps_id, 'chmod 600 /dev/ppp')
        end

        if @features['kvm'][key]
          vzctl(:exec, @vps_id, 'mknod /dev/kvm c 10 232', false, [8,])
        end
      end

      ok
    end
  end
end
