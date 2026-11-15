const TRANSFER_REASON_KEYS: Record<string, string> = {
  invalid_zone: 'dns.zone.transfers.log.reason.invalid_zone',
  refused: 'dns.zone.transfers.log.reason.refused',
  not_authoritative: 'dns.zone.transfers.log.reason.not_authoritative',
  not_found: 'dns.zone.transfers.log.reason.not_found',
  servfail: 'dns.zone.transfers.log.reason.servfail',
  timeout: 'dns.zone.transfers.log.reason.timeout',
  connection_failed: 'dns.zone.transfers.log.reason.connection_failed',
  tsig_error: 'dns.zone.transfers.log.reason.tsig_error',
  unknown: 'dns.zone.transfers.log.reason.unknown',
};

/** Translate known event reasons while retaining unrecognized server diagnostics. */
export function dnsTransferReason(t: (key: string) => string, code: unknown, reason: unknown): string {
  const reasonCode = typeof code === 'string' ? code.trim() : '';
  const key = TRANSFER_REASON_KEYS[reasonCode];
  if (key) return t(key);
  return (typeof reason === 'string' ? reason.trim() : '') || reasonCode;
}
