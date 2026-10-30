# Primary-location free-IP suggestions — 2026-10-30

REQ-050. Prepared on `dev/ip-suggestions-primary-location`, based on the
maintainer's dev preview PR112 (`455ea11f`), not on colleagues' pending PRs.
No merge or deployment is authorized by this implementation entry.

## Cause and change

Read-only production queries reproduced the exact failure: a Prague location
filter includes the associated Playground network. Its first 50 free IPv4
allocations fill the response; filtering by primary location then removed all
50. The next cursor returned actual Prague stock (network 21), proving that the
empty sample did not mean an exhausted Prague pool. No production data changed.

Continue ascending-ID pages within the existing single 12-second capability
and address budget. Stop at three eligible samples, a short page, or 20 pages.
Reject non-increasing cursors and oversized pages. Scan bounds/timeouts stay
errors; do not silently publish false empty availability. Preserve disabled
network filtering, IPv6 /64 policy, progressive locations, separate manual
filters and shared capability cache isolation. Split pagination regression
coverage from the existing caller-budget suite rather than raising file budgets.

## Verification

On the isolated runner on the dev machine (no Mac browsers): `ci:quick`, 58
networking-hook/model unit tests and the production build passed. The same new
English regression failed on the deployed dev bundle in desktop Chromium and
mobile WebKit, as expected: Prague addresses from page two were absent.
Candidate browser checks passed 12/12 (cs/en, desktop Chromium, mobile Chrome
and mobile WebKit), including existing progressive request-budget checks.
The first candidate run exposed a test expectation mismatch: mobile cards use
the full location name, desktop rows its abbreviation. Correcting that assertion
preserves the same address/cursor checks. The original failed logs remain.

Implemented synthetic screenshots:
[desktop](images/2026-10-30-ip-primary-location/desktop-cs.png),
[mobile WebKit](images/2026-10-30-ip-primary-location/mobile-webkit-cs.png). All browser API fixtures are synthetic
and do not certify API permissions. Read-only production evidence is distinct.
Remote logs: `/data/webui-browser-runner/evidence/ip-primary-20261030`.

## Boundaries

No API code, accounting reconciliation, production mutation, merge or deployment.
The standalone KB capture repository is absent locally; external localized KB
screenshots are not certified by this change. No visible label/navigation
changes in this pagination fix. Terminology procedure reviewed at locked
vpsAdmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
