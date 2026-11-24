# DNS-zone serial and server report clarity — 2026-11-15

Approved DNS-06 bd22f810e9fc102f, DNS-07 3111d3e4ead62bc7,
DNS-08 c670bbaa21b45480 and DNS-13 b0da9ef50367fbb2; REQ-049.
The finite acceptance matrix and original evidence are in
/data/webui-browser-runner/verification-20261103/todo-dns-zone-dialog-status-20261115.

Real deployed devdc937df assets with intercepted API/session fixtures reproduced
server reports below12 peers/history (Y~4800 on320px mobile) and ambiguous zone
counter1 versus server-reported2026111401. Eight baseline cases passed;40 raw
captures retained,10 representative images individually viewed. This is not a
real DNS transfer, production/OAuth, permission or physical Safari certification.

Distinguish configuration, observed serials, missing values and last transfer
events using existing API22adc fields. Move reports above configuration/history,
with responsive read-only cards and independent query feedback. Preserve the
previous peer-list availability gate for Create and retain all query/mutation/
owner/transaction contracts. Existing primary-server fields/actions remain,
with explicit reported serials, roles and assignment identity. Improve related
Czech transfer wording and keep English meanings consistent.

API source, models, create operations, supervisor report/event updates and
nonadmin primary transfer-field masking were inspected. Colleague PR219 requires
other API/SDK support and remains outside this change; held116/117 and DNS01
naming-model choices are untouched. Terminology follows locked vpsAdmina65a4dfe;
complete guide/procedure read, no legacy PHP/API KB pin replaced by a React SHA.

Current state: prepared working implementation, not committed/CI qualified or
deployed. Serial/event model tests, types, i18n and relevant browser regressions
are being collected. Complete exact focused checks/builds, clean local Nix,
original hosted CI and paired/protected delivery remain separate gates. No live
DNS objects or mutations, API activation, merge/approval, production/newadmin,
builder access, scheduler change or autonomous worker.

Working-artifact verification: both sources passed the complete ci:quick and
production build. The focused DNS unit suite passed 48 cases; the cumulative
suite passed 65. Each source passed 36 new browser cases on Chromium, mobile
Chrome and Linux mobile WebKit, plus 18 existing DNS regressions on Chromium
and mobile Chrome, with no retries, failures or skipped cases. New coverage
includes member, support My, administrator My/All, Czech dark and English
light, independent section loading/error/retry/empty feedback, unknown and
zero serials, and dated transfer events. Existing tests retain owner-scoped
lookup, failed deletion/retry, confirm/cancel and active-transaction gates.

Structural comparison confirms all four existing query calls and both full
mutation calls are unchanged, including preflight and lock callbacks, in
both sources. Eleven inspected API contract files match unchanged revision
22adc8b54d464e0f899550746b69181930da80fd. Four representative raw working
captures were individually reviewed; they are synthetic fixtures, not
matched before/after or deployed evidence. Local width-token and JSON-format
check failures are retained with their corrections; no checks were weakened.

This commit is prepared for exact committed verification. Clean local Nix,
original hosted CI, paired activation and protected TODO delivery remain
separate gates. No real DNS objects were created or changed.

## Maintainer DNS-13 revision — 2026-11-24

Keep each complete DNS server IPv4/IPv6 address on one line instead of breaking
IPv6 into two lines. The address has its own horizontal scroll area when needed,
with keyboard focus and unchanged full clipboard value. Server rows/cards and
transfer reports share the renderer, keeping their Copy and action controls
reachable. The surrounding page must not overflow on narrow screens. No data,
API, permission, mutation or localization change. Existing long-address browser
coverage now checks one-line rendering and keyboard access. Exact focused checks,
CI, screenshots and paired preview delivery are pending; no completion claim.

The first native artifact run caught real mobile overflow after preventing
address wrapping: the card's start-aligned identity container still sized itself
to unbroken contents. Constrain it to the card width and retain a maximum-width
address row, so only the address scrolls. Original failed traces are retained;
rerun the same full focused assertions and build without weakening width limits.

Corrected revision: full focused quick checks,script/BFF suites,60 relevant DNS
unit cases in8 files and native production build pass. All36 native artifact
browser cases pass across desktop Chromium,mobile Chrome and mobile WebKit,
CS/EN and member/support/admin My/admin All,including one-line complete text,
keyboard focus, bounded card/document widths, serial edge cases and independent
read errors.0failure/skip/retry/flaky; no writes or uncaught errors. Product hashes
bind this checkout to the successful native overlay. This is fixture evidence,
not deployed DNS or live API authorization. Initial14 genuine mobile overflow
failures/18passes/4interrupted cases and setup corrections remain retained.
Clean Nix,exact-head CI and paired activation remain separate pending gates.

Synthetic implemented candidate: [desktop](screenshots/2026-11-24-dns-address-review/desktop.png),
[mobile](screenshots/2026-11-24-dns-address-review/mobile.png).
