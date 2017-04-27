class Setup < ActiveRecord::Migration
  def change
    create_table :monitored_events do |t|
      t.string      :monitor_name,        null: false, limit: 100
      t.string      :class_name,          null: false, limit: 255
      t.integer     :row_id,              null: false
      t.integer     :state,               null: false
      t.timestamps                        null: false
      t.datetime    :closed_at,           null: true
    end

    add_index :monitored_events, :monitor_name
    add_index :monitored_events, :class_name
    add_index :monitored_events, :row_id
    add_index :monitored_events, :state

    create_table :monitored_event_logs do |t|
      t.references  :monitored_event,     null: false
      t.boolean     :passed,              null: false
      t.string      :value,               null: false, limit: 255
      t.datetime    :created_at,          null: false
    end

    add_index :monitored_event_logs, :monitored_event_id
    add_index :monitored_event_logs, :passed
  end
end
