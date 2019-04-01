require 'filelock'
require 'fileutils'

module NodeCtld
  class VpsConfig::TopLevel
    include Utils::Pool

    # @return [String]
    attr_reader :pool_fs

    # @return [Integer]
    attr_reader :vps_id

    # @return [VpsConfig::NetworkInterfaceList]
    attr_reader :network_interfaces

    # @param mounts [Array<VpsConfig::Mount>]
    # @return [Array<VpsConfig::Mount>]
    attr_accessor :mounts

    # @param pool_fs [String]
    # @param vps_id [Integer]
    def initialize(pool_fs, vps_id)
      @pool_fs = pool_fs
      @vps_id = vps_id

      if exist?
        load
      else
        @network_interfaces = VpsConfig::NetworkInterfaceList.new
        @mounts = []
      end
    end

    def load
      data = lock { YAML.load_file(path) || {} }

      @network_interfaces = VpsConfig::NetworkInterfaceList.load(data['network_interfaces'] || [])
      @mounts = (data['mounts'] || []).map { |v| VpsConfig::Mount.load(v) }
    end

    def save
      save_to(path)
      true
    end

    def backup
      save_to(backup_path)
    end

    def restore
      lock do
        File.rename(backup_path, path)
        load
      end
    end

    def exist?
      File.exist?(path)
    end

    def backup_exist?
      File.exist?(backup_path)
    end

    protected
    def config
      {
        'network_interfaces' => network_interfaces.save,
        'mounts' => mounts.map(&:to_h),
      }
    end

    def load
      data = lock { YAML.load_file(path) }

      @network_interfaces = VpsConfig::NetworkInterfaceList.load(data['network_interfaces'])
      @mounts = (data['mounts'] || []).map { |v| VpsConfig::Mount.load(v) }
    end

    def save_to(file)
      FileUtils.mkpath(File.dirname(file))
      lock { File.write(file, YAML.dump(config)) }
    end

    def lock
      if @locked
        yield
      else
        Filelock(path) do
          @locked = true
          ret = yield
          @locked = false
          ret
        end
      end
    end

    def path
      File.join('/', pool_fs, path_to_pool_working_dir(:config), 'vps', "#{vps_id}.yml")
    end

    def backup_path
      "#{path}.backup"
    end
  end
end
