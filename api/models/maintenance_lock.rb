class MaintenanceLock < ActiveRecord::Base
  belongs_to :user

  # Return a new MaintenanceLock instance that may be used to lock
  # +obj+.
  def self.lock_for(obj, user: nil, reason: 'Reason not specified')
    new(
      class_name: obj.class.to_s,
      row_id: obj.id,
      reason: reason,
      user: user || ::User.current
    )
  end

  def lock!(obj)
    self.class.transaction do
      tmp = self.class.find_by(
        class_name: class_name,
        row_id: row_id,
        active: true
      )

      return false if tmp

      self.active = true
      save!

      # Lock self and all children objects.
      obj.update!(
        maintenance_lock: maintain_lock(:lock),
        maintenance_lock_reason: self.reason
      ) if obj && obj.respond_to?(:update!)

      lock_children(obj || ::Object.const_get(self.class_name).new)
      true
    end
  end

  def lock_children(parent)
    children = parent.class.maintenance_children
    return unless children

    children.each do |child|
      parent.method(child).call.where(maintenance_lock: maintain_lock(:no)).each do |obj|
        obj.update!(
          maintenance_lock: maintain_lock(:master_lock),
          maintenance_lock_reason: self.reason
        )

        lock_children(obj)
      end
    end
  end

  def unlock!(obj)
    self.class.transaction do
      self.active = false
      save!

      obj ||= ::Object.const_get(self.class_name).new

      # Unlock all children objects that are otherwise
      # not locked.
      master_lock = obj.find_maintenance_lock

      if master_lock
        obj.update!(
          maintenance_lock: maintain_lock(:master_lock),
          maintenance_lock_reason: master_lock.reason
        ) if obj && obj.respond_to?(:update!)

        master_lock.lock_children(obj)

      else
        obj.update!(
          maintenance_lock: maintain_lock(:no),
          maintenance_lock_reason: nil
        ) if obj && obj.respond_to?(:update!)

        unlock_children(obj || Object.const_get(self.class_name).new)
      end

      true
    end
  end

  def unlock_children(parent)
    children = parent.class.maintenance_children
    return unless children

    children.each do |child|
      parent.method(child).call.all.each do |obj|
        next if obj.find_maintenance_lock

        obj.update!(
          maintenance_lock: maintain_lock(:no),
          maintenance_lock_reason: nil
        )

        unlock_children(obj)
      end
    end
  end

  def maintain_lock(*args)
    self.class.maintain_lock(*args)
  end

  def self.maintain_lock(k)
    opts = %i(no lock master_lock)

    if k.is_a?(::Symbol)
      opts.index(k)
    else
      opts[k]
    end
  end
end
