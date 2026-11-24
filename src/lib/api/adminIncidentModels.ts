/** Presentation models for the admin views, not generated SDK declarations. */
export interface AdminIncidentPageMeta extends Record<string, unknown> {
  total_count: number;
  offset: number;
  limit: number;
  next_offset: number | null;
  as_of: string;
  read_at: string;
  from?: string | null;
  to?: string | null;
}

export interface AdminIncidentExposure {
  id: string;
  vps: { id: number; hostname: string };
  user: { id: number; login: string };
  node: { id: number; domain_name: string };
  policy_key: string;
  label: string;
  owner_active: boolean;
  transfer_pending: boolean;
  count_7d: number;
  count_30d: number;
  warning_period_days: number;
  stop_period_days: number;
  warning_limit: number | null;
  stop_limit: number | null;
  warning_remaining: number | null;
  stop_remaining: number | null;
  configuration_valid: boolean;
  status: string | null;
  global_mode: string;
  effective_mode: string | null;
  warning_permitted: boolean | null;
  stop_enforced: boolean | null;
  last_incident_at: string | null;
  last_warning_at: string | null;
  next_warning_allowed_at: string | null;
  last_stop_at: string | null;
  next_stop_allowed_at: string | null;
  accounting_since: string | null;
  outstanding_stop_state: string;
  outstanding_stop_action_id: number | null;
  outstanding_stop_chain_id: number | null;
  latest_action_id: number | null;
  latest_action_chain_id: number | null;
  latest_notice_report_id: number | null;
  latest_action_kind: string | null;
  latest_action_state: string | null;
  latest_mail_state: string | null;
  latest_stop_completed_at: string | null;
}

export interface AdminIncidentEvaluation {
  id: number;
  incident_report_id: number;
  vps_id: number | null;
  user_id: number | null;
  hostname: string | null;
  user_login: string | null;
  policy_key: string;
  label: string;
  evaluated_at: string;
  detected_at: string | null;
  matched: boolean | null;
  state: string;
  warning_period_days: number;
  stop_period_days: number;
  count_7d: number | null;
  count_30d: number | null;
  warning_limit: number | null;
  stop_limit: number | null;
  effective_mode: string | null;
  stop_enforced: boolean | null;
  threshold_status: string | null;
  decision: string;
  action_id: number | null;
  action_kind: string | null;
  action_state: string | null;
  action_created_at: string | null;
  action_updated_at: string | null;
  transaction_chain_id: number | null;
  physical_stop_action_id: number | null;
  stop_completed_at: string | null;
  notice_report_id: number | null;
  mail_state: string | null;
  mail_queued_at: string | null;
  mail_finished_at: string | null;
}
