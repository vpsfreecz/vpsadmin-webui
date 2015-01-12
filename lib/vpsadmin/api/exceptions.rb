module VpsAdmin::API::Exceptions
  class AccessDenied < ::StandardError

  end

  class IpAddressInUse < ::StandardError

  end

  class IpAddressNotAssigned < ::StandardError

  end

  class IpAddressInvalidLocation < ::StandardError

  end

  class DatasetAlreadyExists < ::StandardError
    attr_reader :dataset, :path

    def initialize(ds, path)
      @dataset = ds
      @path = path
      super("dataset '#{path}' already exists")
    end
  end

  class DatasetDoesNotExist < ::StandardError
    attr_reader :path

    def initialize(path)
      @path = path
      super("dataset '#{path}' does not exist")
    end
  end

  class DatasetLabelDoesNotExist < ::StandardError
    attr_reader :label

    def initialize(label)
      @label = label
      super("dataset label '#{label}' does not exist")
    end
  end

  class SnapshotAlreadyMounted < ::StandardError
    attr_reader :snapshot

    def initialize(snapshot)
      @snapshot = snapshot
      super("snapshot '#{snapshot.dataset_in_pool.dataset.full_name}@#{snapshot.snapshot.name}' is already mounted to VPS #{snapshot.mount.vps_id} at #{snapshot.mount.dst}")
    end
  end
end
