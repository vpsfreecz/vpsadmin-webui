require 'erb'
require 'tempfile'
require 'fileutils'

module NodeCtld
  class Vps
    include OsCtl::Lib::Utils::Log
    include Utils::System
    include Utils::OsCtl
    include Utils::Zfs

    def initialize(veid, cmd = nil)
      @veid = veid
      @cmd = cmd
    end

    def start
      osctl(%i(ct start), @veid)
      osctl(%i(ct set autostart), @veid)
    end

    def stop(params = {})
      osctl(%i(ct stop), @veid)
      osctl(%i(ct unset autostart), @veid)
    end

    def restart
      osctl(%i(ct restart), @veid)
      osctl(%i(ct set autostart), @veid)
    end

    def ip_add(addr, v, register, shaper)
      if register
        # TODO
        # Shaper.new.shape_set(addr, v, shaper)
        Firewall.accounting.reg_ip(addr, v)
      end

      osctl(%i(ct netif ip add), [@veid, 'venet0', addr])
    end

    def ip_del(addr, v, unregister, shaper)
      if unregister
        # TODO
        # Shaper.new.shape_unset(addr, v, shaper)
        Firewall.accounting.unreg_ip(addr, v)
      end

      osctl(%i(ct netif ip del), [@veid, 'venet0', addr])
    end

    def passwd(user, password)
      osctl(%i(ct passwd), [@veid, user, password])
    end

    def load_file(file)
      vzctl(:exec, @veid, "cat #{file}")
    end

    def ve_private
      $CFG.get(:vz, :ve_private).gsub(/%\{veid\}/, @veid.to_s)
    end

    def ve_root
      "#{$CFG.get(:vz, :vz_root)}/root/#{@veid}"
    end

    def status
      osctl_parse(%i(ct show), @veid)[:state].to_sym
    end

    def honor_state
      before = status
      yield
      after = status

      if before == :running && after != :running
        start

      elsif before != :running && after == :running
        stop
      end
    end

    def ve_private_ds
      "#{$CFG.get(:vps, :zfs, :root_dataset)}/#{@veid}"
    end

    def log_type
      if @cmd
        @cmd.log_type
      else
        "vps=#{@veid}"
      end
    end
  end
end
