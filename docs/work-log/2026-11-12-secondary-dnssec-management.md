# Distinguish secondary DNSSEC management from signing status

Prepare approved DNS-02 / REQ-049. Actual clean C9 baseline desktop/mobile
shows an external secondary zone as No DNSSEC in list/header, exposes a local
DNSSEC checkbox, and returns a false-empty local-key view at a direct DNSSEC
URL. The API22adc DNS configuration enables signing only for internal primary
server zones and only primary status reports keys. A local flag cannot attest
to the upstream secondary-zone signature state.

Use one neutral primary-server-management badge in list and header, explicit
help in secondary settings and at the direct DNSSEC URL. Do not send a secondary
DNSSEC setting when saving unrelated settings; keep all primary controls,
values, API operations, ownership/busy gates and other fields. DNSSEC list
filter requests remain unchanged; help describes the local setting. Missing
primary status stays unknown. No API, BFF, SDK, schema, dependency, zone-kind
rename or DNS-01 model selection.

Localization: actual locked vpsAdmin terminology
a65a4dfeb92a59df4a80a737a20bcbf8558793ff and both full guides read. CS/EN
labels keep DNSSEC and primary-server terminology. The KB workflow/registry
currently binds legacy PHP controls, not these React badges/settings. No
applicable API/legacy pin is changed, and no new external screenshot or wiki
certification/publication is claimed.

Final before fixtures2 pass with settled read-only empty record logs and four
individually viewed raw header/settings captures. Initial unsettled captures
and a failed exact-empty-label expectation are retained privately. The new
48-case fixture matrix/native/build/strict checks are in progress, not yet
qualified. Fixture roles/mutations do not prove live permission, DNS publication,
backend execution, OAuth or physical Safari. Current actual previews remain C9;
the cumulative development parent DCB25 is the prepared DNS-03 candidate and
must itself pass CI/delivery before a child can be activated. No merge or
production/API deployment is authorized by these local checks.


Local verification: pinned ci:quick/build and4 existing zone-model tests pass
on both foundations, with corrected strict E2E roots113/245. Final working48
fixtures pass without retry/page errors:20 secondary cases omit the signing
setting and make no key request;28 primary cases preserve the explicit toggle
and key controls. All48 PUTs are intercepted, no live writes. CSdark/ENlight,
member/admin-My/support-My, Chromium1440/Linux mobileWebKit320, keyboard and
bounds checked; not live/selected-owner permissions or physical Safari. Four
settled before and four working after raw originals individually viewed.
The initial matrix8PASS11FAIL2INTERRUPTED/27unrun is preserved. Its fixture
assumed a flat query key; trace proves dnssec_record[dns_zone]. Only the test
assertion changed to the existing wire contract; application requests, APIs,
assertion intent, timeouts and retries did not change. Exact own CLI stopped
with SIGINT130 and cleanup0; final full48 completed with cleanup0.
Clean Nix/clean browser, hosted CI and paired/protected release remain pending.
