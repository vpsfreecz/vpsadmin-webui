export interface LifecycleValues {
  state: string;
  expiration: string | null;
  reminder: string | null;
}

export function sameLifecycleTimestamp(left: string | null, right: string | null): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

/** HaveAPI accepts a nullable expiration, but a reminder must be a datetime. */
export function buildLifecyclePayload(current: LifecycleValues, next: LifecycleValues, reason: string) {
  const payload: Record<string, unknown> = {};
  const stateChanging = next.state !== 'unknown' && next.state !== current.state;
  const expirationChanging = !sameLifecycleTimestamp(next.expiration, current.expiration);
  const reminderChanging = !sameLifecycleTimestamp(next.reminder, current.reminder);

  if (stateChanging) payload['object_state'] = next.state;

  if (stateChanging || expirationChanging || (reminderChanging && next.reminder === null && next.expiration !== null)) {
    // Reapplying the expiration without a reminder also clears an existing
    // reminder. Sending remind_after_date: null fails API input validation.
    payload['expiration_date'] = next.expiration;
    if (next.expiration !== null && next.reminder !== null) {
      payload['remind_after_date'] = next.reminder;
    }
  } else if (reminderChanging && next.expiration !== null && next.reminder !== null) {
    payload['remind_after_date'] = next.reminder;
  }

  if (Object.keys(payload).length && reason.trim()) payload['change_reason'] = reason.trim();
  return payload;
}
