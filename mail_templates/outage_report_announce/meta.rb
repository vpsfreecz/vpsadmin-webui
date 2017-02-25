template :outage_report_event do
  label        'Outage report announcement'
  from         'podpora@vpsfree.cz'
  reply_to     'podpora@vpsfree.cz'
  return_path  'podpora@vpsfree.cz'

  lang :en do
    subject    "[Outage report] <%= @o.planned ? 'Planned' : 'Unplanned' %> outage - <%= @o.entity_names.join(',') %> - <%= @o.begins_at.strftime('%Y-%m-%d %H:%M') %>"
  end
end
