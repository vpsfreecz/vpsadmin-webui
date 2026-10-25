# Sunday maintenance windows — 2026-10-25

Status: prepared on `dev/maintenance-sunday`; not merged or deployed.
Source: [Discourse post 7](https://discourse.vpsfree.cz/t/372/7), REQ-023.

The frontend used weekdays 1–7 while the API and legacy UI use 0–6, with Sunday
0. Consequently an open Sunday looked closed and a Sunday save targeted a missing
weekday 7. The frontend now preserves Monday-first display but uses API weekday
0 for Sunday throughout baseline lookup, editing, bulk opening and PUT requests.
The adapter documents that day keys are not maintenance-window resource IDs.

Read-only inspection of `VpsMaintenanceWindow`, the nested VPS maintenance API
and legacy `page_adminvps.php` confirmed the contract. No API, translation,
backend, database or deployment changes are needed. Role/state gates, API weekly
minimum validation, partial-save reconciliation and unchanged-day omission remain.

## Verification

Synthetic browser scenarios start from all seven real API weekday keys. They
cover Sunday initial times, rejected saves retaining drafts, successful save and
reload, closing Sunday, and bulk opening each weekday exactly once. Existing
Monday save, partial-save recovery and mobile editor regressions are included.
Completed local command receipts follow. This is fixture evidence, not a live API audit.

## Final local checks

Toolchain: Node 24.21.0 / npm 11.19.0 matching the repository pin; root and
BFF dependencies installed with `npm ci`. No active Git hook framework or
non-sample hook files were declared. Actual worktree author/committer identities
were checked before committing.

- `npm run ci:quick`: passed, including strict adoption of the new browser spec
  (72 checked, 196 deferred), type checks, localization/structure audits and
  documentation audits. Inventory regenerated where adapter types changed.
- `npm test`: 1869 tests in 301 files passed.
- `npm run test:scripts`: 226 passed; `npm run test:bff`: 57 passed.
- `npm run build`: passed; existing large-chunk warning remains.
- Targeted Playwright: 15 successful browser checks across desktop Chrome,
  mobile Chrome and the explicitly selected mobile WebKit scenarios.

Early development runs identified fixture/setup errors, not a final green suite:
the initial script run lacked BFF `cookie-signature` before BFF `npm ci`; browser
fixtures/strict coverage declarations were corrected before the final runs.
No full PR/nightly browser suite or live dev mutation/permission audit is claimed.
No new preview was deployed to dev.crucio.cz. The shared dev host's previously
reported disk-space blocker was respected; no large Nix rebuild or cleanup ran.

Root production dependency audit: zero findings. Main's unchanged BFF dependency
baseline still reports the high body-parser advisory GHSA-27r3-jxmh-p828.
The separately prepared `dev/bff-body-parser-patch` (`6ebe859e`) addresses it;
that security review is deliberately not folded into this feature branch.
These results do not mean every remote CI/release gate is green.

## Review publication

GitHub CLI authentication still returns HTTP 401. Safari fallback did not become
usable (app selection timed out). No PR or remote PR CI can be claimed. The
branch and prepared PR description are retained for publication after access is
restored. Main was checked again as `5a2d2bdc3ad7a827038f877d75959916528db844`.
Merge/deployment remain subject to the maintainer's explicit decision.

## Implemented UI captures

Synthetic fixtures only; no real member data, credentials or consent changes.

[Desktop Sunday](screenshots/2026-10-25-maintenance-sunday/desktop-sunday.png)

[Mobile Sunday](screenshots/2026-10-25-maintenance-sunday/mobile-sunday.png)
