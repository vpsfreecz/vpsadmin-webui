# Approved TODO work and paired preview — 2026-11-03

The selected preview is active on **dev.crucio.cz** and
**clankerdev.vpsfree.cz** at clean source
`858039df37f7c74819a778696a78dba645c3ea36`. Production newadmin remains
`70bd11d983e7dfd11f99604791ad68562807ee2e`; its public build/config were compared
read-only with the initial snapshot. No PR was approved or merged. No production
pin, API, database, mailer, queue, credential or unrelated service was changed.

## Review scope

| TODO | Result and review artifact |
| --- | --- |
| UX-03 | [PR128](https://github.com/vpsfreecz/vpsadmin-webui/pull/128), `09ef7d95`: VPS list input/actions now share 44px height; previously 44/32px. Other forms are outside this bounded change. |
| UX-04 | [PR129](https://github.com/vpsfreecz/vpsadmin-webui/pull/129), `7ef32473`: dashboard widget editor uses existing strong borders and h2/h3 hierarchy. Includes exact page-h1 smoke correction; no global palette or settings changes. |
| UX-02 | [PR130](https://github.com/vpsfreecz/vpsadmin-webui/pull/130), `f23aa8ba`: connected synthetic member journey from VPS discovery through rejection/draft/retry, target review, resource task completion, SSH key review/progress/result and return. Test coverage only; no new global workflow redesign. |
| PUB-01/02/03/04/05/07 | Existing public-theme/news/readability changes were verified. No duplicate application PRs. Distinct translated news bodies and fallbacks are demonstrated by fixtures, not fully by the dev's real public data. |
| PUB-08/09/10/11 | Approved during this work and verified against existing code: accessible hidden page headings, brand/statistics geometry, aligned numeric cards without duplicate node/donut card, and urgent/planned/resolved/empty outage ordering. |
| NAV-01 | Approved during work; existing timed/unlimited session link focuses the correct visible profile field without sending a user update, including repeat navigation to the same hash. |

All PRs target `kerrycek-021126`. The selected source starts from `13a39a58`,
adds only our three changes and the test-selector follow-up, and excludes main's
additional client/DNS/colleague work. Preview composition is on
`dev/todo-approved-preview-20261103`; the integration branch and main were not
updated. Initial decisions were revision14; five new approvals produced revision19.
Their conditions were read before promotion. The user prefers approving further
items gradually; re-read choices during ongoing work and at every new chat.

## Verification

- Each focused change passed `ci:quick`. Before-fix probes reproduced the
  filter-height mismatch and the dashboard editor boundary contrast of 1.18:1.
- Focused browser runs: filters21, dashboard15 plus two final captures,
  connected journey6, and corrected authenticated-home smoke6 passed with no
  retries. Desktop Chromium, mobile Chrome and mobile WebKit were covered.
- Combined source `ci:quick`, script checks,58 BFF tests and309 unit files /
  1937 unit tests passed. GitHub exact-source CI on858039df also passed required
  nonbrowser checks, production build and Chromium script regression.
- Paired Nix frontend/BFF builds and provenance/source/package-content checks
  passed. Both metadata objects identify858039df and dirty=false. BFF runtime
  files match the old deployed bytes; existing production dependency inputs are
  unchanged. Dependencies were prepared in isolated builds, never installed in
  a serving release.
- **Exact compiled858 acceptance:81 passed, zero retries.** Public cs/en,
  light/dark, theme persistence, translated-body/fallback fixtures, public
  geometry/ordering/error states, both UI fixes, the connected member journey
  and authenticated-home regression are covered. Separate compiled navigation
  acceptance:15 passed, zero retries, including timed/unlimited member/admin
  session setting links and zero user writes.
- Actual anonymous hosts:6/6 passed (three engines × two hosts), without BFF
  bootstrap or HaveAPI fixtures. Startup, build/config, anonymous session,
  theme/language persistence and geometry were checked. A request guard blocked
  mutation methods; no credentials or authenticated production data were used.
- Paired activation checked actual BFF process cwd/source separately from the
  frontend build-info; strict config, anonymous session, health, four deep links
  and entry assets passed on each host. Existing LoadCredential sources and
  loaded values matched by private hashes, retired plaintext secret environment
  variables stayed absent, other service PIDs and config fingerprints stayed
  unchanged. Old hashed assets remain available for existing open tabs.
- Standalone TODO metadata QA passed in all three engines:14 current evidence
  summaries,320px geometry and zero decision writes. Publication preserved all96
  proposal versions, IDs and image mappings; state stayed revision19 with SHA256
  `71ac2f47732a8e99ddc23e75d005b487bfd5fb211c1607c5dfbcbd15c138fab8`.
  The TODO service did not restart; site/catalog/API/PDF still require auth.

PR128 and130 have all six checks green. The corrected PR129 head has green
nonbrowser/build/script checks; its three full remote browser jobs were still
running when this receipt was first written. The exact deployed candidate's
checks and local compiled acceptance above had completed before promotion.
Read current GitHub status before any later review/merge; this receipt grants
neither approval nor merge authority.

## Failures retained and resolved

The original PR129 mobile-Chrome job passed593 cases and failed the existing
Dashboard substring heading locator. The newly semantic Dashboard preferences h2
made it match two headings. Follow-up7ef32473 requires the exact level1 page title
and includes the existing home smoke in WebKit; navigation/KPI assertions remain.
[Original failed run](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41679913954).

The first attempted dev promotion of25fcc078 happened after a failed shell
readiness assertion because the shell did not fail fast. This was an operator
mistake. The post-restart cwd guard failed and automatically restored both old
pointers and restarted the old BFF. Health/build/config/session were then verified.
No clankerdev/production activation occurred in that attempt. Receipts were kept.
The new helper requires a separate exact-source readiness receipt. It also polls
actual cwd: both successful activations observed Type=simple's new active PID
initially at `/`, then at the correct BFF cwd. It waits for the latter.

Other retained setup failures: initial missing BFF dependencies in source tests;
read-only shared Vite cache; strict compiled bootstrap rejecting HTTP; Chromium
rejecting an ephemeral Ed25519 test cert; local HTTP/1.0 CSS loads failing
ERR_TOO_MANY_RETRIES; an anonymous-smoke helper checking menu visibility before
React mounted after reload; root-run namespace access to a user-owned700 QA tree.
These were fixed in isolated tooling/fixtures, with failed logs retained. Final
tests used RSA HTTPS, HTTP/1.1 and backlog128, a task-owned dependency copy,
correct control readiness and the normal unprivileged runner. No application
assertions, production bootstrap restrictions or real-host TLS settings were
weakened. Some first result directories were overwritten during diagnostics;
the retained logs, excerpts and replacement diagnostics are distinguished.

## Runtime, rollback and durable evidence

| Site | Active pair | Retained previous pair |
| --- | --- | --- |
| dev | `/data/webui-approved-20261103-v2/releases/858039df37f7c74819a778696a78dba645c3ea36`, frontend `dist/`, BFF PID1269828 | `/data/webui-public-sidebar-preview-20261101/releases/4dec43bb9b6451df81053a1768d1190b7d67c916` |
| clankerdev | `/opt/webui-next/releases/webui-858039df37f7c74819a778696a78dba645c3ea36`, source `vpsadmin/webui-next`, BFF PID251059 | same layout under `webui-70bd11d983e7dfd11f99604791ad68562807ee2e` |

Recheck actual live state and locks before recovery; do not overwrite a newer
operator's release. Restore both previous frontend/BFF pointers and restart only
`webui-next-bff`, preserving current settings and sessions. The reusable source
procedure is `docs/operations/older-hosts.md`. No configuration-repository pin is
used for these manual older-host previews; production configuration is untouched.

- Canonical continuity: `/data/vpsadmin-ux-todo/operations/CONTINUITY.md`.
- Task source/helpers/report: `/data/codex-workspaces/vpsadmin-approved-20261103`.
- Browser logs/evidence: `/data/webui-browser-runner/verification-20261103/approved`.
- Private dev receipts: `/data/webui-approved-20261103-v2/private`.
- Private remote receipts: `/opt/webui-next/preview-858039df37f7c74819a778696a78dba645c3ea36-private`.
- Standalone TODO release: `releases/20261103-approved-work-evidence`;
  `operations/approved-work-evidence-deployment.json` and preserved catalog backup.
  Rebuild source with the preserved baseline + evidence review +
  `source/implementation-progress-20261103.json`, which overrides only
  `analysis.current`. Agent activity never uses user notes or completion fields.
- Public worksheet PDF and earlier screenshots remain historical evidence;
  they were not relabelled as new live captures. New implemented UI screenshots
  for the two fixes are linked in their PR work-log entries and use synthetic data.

Broader UX-02/03/04 remain partial. The prior actual dev API audit remains separate
from these fixtures: positive VPS provisioning/storage/console/export coverage
is still blocked/limited by the recorded dev mailer failure and HTTP423. Closed
audit identities stay closed; queued mailer NoOps/locks were not modified.
Physical iPhone/passkeys and complete real MFA/refresh flows remain unverified.
Known dev TLS SAN mismatch and twelve moderate development-toolchain findings
were not changed by this UI work. Clankerdev still points to the production API;
preview permission does not authorize real API mutation tests there.
