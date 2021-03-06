require 'vpsadmin/api/lifetimes'

class ObjectState < ::ActiveRecord::Base
  belongs_to :user
  enum state: VpsAdmin::API::Lifetimes::STATES

  def self.new_log(obj, state, reason, user, expiration)
    new(
      class_name: obj.class.name,
      row_id: obj.id,
      state: state,
      reason: reason,
      user: user,
      expiration_date: expiration
    )
  end
end
