VpsAdmin::API::DatasetProperties.register do
  property :atime do
    type :bool
    label 'Access time'
    desc 'Controls whether the access time for files is updated when they are read'
    default false
  end

  property :compression do
    type :bool
    label 'Compression'
    desc 'Toggle data compression in this dataset'
    default true
  end

  property :recordsize do
    type :integer
    label 'Record size'
    desc 'Specifies a suggested block size for files in the file system'
    default 128*1024

    validate do |raw|
      raw >= 4096 && raw <= 128 * 1024 && (raw & (raw - 1)) == 0
    end
  end

  property :refquota do
    type :integer
    label 'Quota'
    desc 'Limits  the amount of space a dataset can consume'
    default 0
    inheritable false
  end

  property :relatime do
    type :bool
    label 'Relative access time'
    desc "Access time is only updated if the previous access time was earlier than the current modify or change time or if the existing access time hasn't been updated within the past 24 hours"
    default false
  end

  property :sync do
    type :string
    label 'Sync'
    desc 'Controls the behavior of synchronous requests'
    default 'standard'
    choices %w(standard disabled)
  end
end
