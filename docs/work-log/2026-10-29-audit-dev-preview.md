# Reviewed audit fixes: dev-only preview — 29 October 2026

Status: prepared; activation and acceptance results follow after completion.
The maintainer requested deploying the reviewed changes to dev.crucio.cz.
This authorizes the selected dev preview, not merging main, production promotion,
API changes or shared infrastructure repairs.

## Selected source and scope

Base main: `40653dffed4561dd6086716fd506a7223d3631d7`.
Observed previous paired dev runtime: `606a02c19f328c69298dd30780c805211fb5cb27`.
Recheck both deployment pointers, BFF process, lock and configuration immediately
before activation. No other deployment may be overwritten.

| PR | Selected original head | Change |
| --- | --- | --- |
| 102 | 3af0ae9b17904a96f7f3139deeb40fa7cfa93274 | Numeric admin IP search means member ownership. |
| 104 | 51c1fb6c59696916ef974c35e03b4ba0ab94aa71 | OAuth provider redirect and local navigation boundaries. |
| 105 | b723721725aef9fcb0e053490cad95b872548d94 | Compatible development dependency security patches. |
| 106 | 135e2031f00d89cd7d524bf3af5ecd2f29d80d4f | Private, redacted live-audit artifacts. |
| 107 | dea423a3817c2752d77e3d74ccf373669058171a | Consolidated VPS network toggle confirmations. |
| 108 | 698fd549c29fc60b8691945d2e28d50406b45461 | Singular metadata proxy security headers. |
| 109 | 2895f24f024011a29feeb55077f5b269ca4f4f0f | Bounded account menu and Escape/focus behavior. |
| 110 | 39ee1e6259bcd0395fc13f1b36dd57bde3252ce4 | Responsive action-state transaction inspection. |
| 111 | a175c6a5e1513b871d0cd422abbe9573e53c61de | Audit report and explicit limits. |

All six required GitHub checks passed for each exact head before preparation.
The preview retains original histories, including PR110's PR109 dependency.
Concurrent work-log insertions preserve both entries. PR63/74 are excluded.
Requirements: REQ-007/010/011/012/040/046/050/059/064/065/068.

## Preparation and activation contract

Build exact clean paired frontend/BFF packages on the development machine in
isolated /data space, with locked dependencies and matching truthful provenance.
Run combined quality, unit/script/BFF and targeted desktop/mobile browser checks.
The earlier seven-fix combined audit did not include PR102; this preview must
verify its inclusion rather than reuse that receipt as proof of the whole tree.

Adapt only the three replaced metadata headers in the effective dev nginx
locations for config.json, config.js and session.json. Preserve current routing,
CSP, OAuth/provider settings, credentials, sessions and all unrelated vhosts;
do not regenerate effective configuration from historical templates. Validate
nginx and candidate BFF configuration with actual systemd credentials before
promotion. Stage immutable matching packages and retain previous hashed assets.

Activate under the existing dev deployment lock with expected-previous checks.
Retain the exact prior frontend/BFF pair and nginx bytes for rollback. Validate
service health, real metadata/origin guards and anonymous bootstrap separately
from browser-local synthetic session/API feature checks against the served
candidate. The browser harness must block direct versioned API writes.

## Explicit limits

No production or configuration-repository input update, main merge, API upgrade,
shared queue repair, test-account re-enablement or unrelated cleanup is included.
The audit's queued NAS fixtures and dev TLS/refresh/payment/passkey limits remain
as documented in the [audit report](../audits/webui-security-review-2026-10-28.md).
A deployed-bundle fixture test is not a new actual cross-member API audit.
