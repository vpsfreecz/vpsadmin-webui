class DatasetInPool < ActiveRecord::Base
  belongs_to :dataset
  belongs_to :pool
  has_many :snapshot_in_pools
  has_many :dataset_trees
  has_many :dataset_properties
  has_many :mounts
  has_many :dataset_in_pool_plans
  has_many :src_dataset_actions, class_name: 'DatasetAction',
           foreign_key: :src_dataset_in_pool_id
  has_many :dst_dataset_actions, class_name: 'DatasetAction',
           foreign_key: :dst_dataset_in_pool_id
  has_many :group_snapshots

  include Lockable
  include Confirmable
  include HaveAPI::Hookable
  include VpsAdmin::API::DatasetProperties::Model
  include VpsAdmin::API::ClusterResources

  cluster_resources required: %i(diskspace),
                    environment: ->(){ pool.node.environment }

  has_hook :create

  def snapshot
    TransactionChains::Dataset::Snapshot.fire(self)
  end

  # +dst+ is destination DatasetInPool.
  def transfer(dst)
    TransactionChains::Dataset::Transfer.fire(self, dst)
  end

  def rollback(snap)
    TransactionChains::Dataset::Rollback.fire(self, snap)
  end

  def backup(dst)
    TransactionChains::Dataset::Backup.fire(self, dst)
  end

  def add_plan(plan, confirm = true)
    p = VpsAdmin::API::DatasetPlans.plans[plan.name.to_sym].register(self)
    VpsAdmin::API::DatasetPlans.confirm if confirm
    p
  end

  def del_plan(dip_plan, confirm = true)
    VpsAdmin::API::DatasetPlans.plans[dip_plan.dataset_plan.name.to_sym].unregister(self)
    VpsAdmin::API::DatasetPlans.confirm if confirm
  end
end
