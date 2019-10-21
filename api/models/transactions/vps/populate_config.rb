module Transactions::Vps
  class PopulateConfig < ::Transaction
    t_name :vps_populate_config
    t_type 4005
    queue :vps

    # @param vps [::Vps]
    def params(vps)
      self.vps_id = vps.id
      self.node_id = vps.node_id

      {
        pool_fs: vps.dataset_in_pool.pool.filesystem,
        network_interfaces: vps.network_interfaces.all.map do |netif|
          {
            name: netif.name,
            routes: netif.ip_addresses.all.map do |ip|
              {
                addr: ip.addr,
                prefix: ip.prefix,
                version: ip.version,
                via: ip.route_via && ip.route_via.ip_addr,
                shaper: {
                  class_id: ip.class_id,
                  max_tx: ip.max_tx,
                  max_rx: ip.max_rx,
                },
              }
            end
          }
        end,
      }
    end
  end
end
