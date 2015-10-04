module VpsAdmind
  class Commands::Vps::Restart < Commands::Base
    handle 1003

    def exec
      VpsAdmind::DelayedMounter.unregister_vps(@vps_id)
      
      @vps = Vps.new(@vps_id)
      @vps.restart
      ok
    end

    def rollback
      ok
    end

    def post_save(db)
      @vps.update_status(db)
    end
  end
end
