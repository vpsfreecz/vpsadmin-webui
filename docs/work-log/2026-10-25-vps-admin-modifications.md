# Admin-team VPS modification preference — 2026-10-25

Status: prepared on `dev/vps-admin-modifications`; not merged or deployed.
Source: [Discourse post 7](https://discourse.vpsfree.cz/t/372/7), REQ-023.

## Implementation and safety

Maintenance now includes the existing legacy preference for allowing admin-team
base-system configuration modifications. The API already exposes and accepts
`allow_admin_modifications` through the blocking VPS update action. No backend
change is required. The copy follows legacy scope: OS-template/base-system
configuration, not applications/data, and email notification.

The initial selection is exactly the existing boolean. Missing data selects
neither option and disables Save. Selection alone never submits; only an explicit
Save sends the single boolean. Request context is frozen to its original VPS,
uses current mutation permission/state gates, busy preflight, durable local lock
and receipt tracking. A successful finished action plus successful read-back of
the requested boolean is required for confirmation; API acceptance is pending.
Rejected drafts remain; ambiguous/missing receipts use the existing layout's
uncertainty reconciliation. Foreign support views cannot edit the setting.

Czech/English copy follows the localization and terminology guides at locked
vpsAdmin revision `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`
(`vpsadminServices` lock node). Separate KB contracts are unchanged; no external
KB screenshots were recaptured. No live member consent has been changed.

## Verification

The new strictly typed synthetic browser scenarios cover members and admins,
both languages, explicit save, unfinished versus completed actions and read-back,
reload persistence, unknown values, suspended VPS, support read-only, explicit
rejection, missing receipts, draft retention and narrow layouts. Completed local receipts
follow below. These fixtures are not a live API authorization audit.

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
- Targeted Playwright: 30 successful browser checks across desktop Chrome,
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

[Desktop preference](screenshots/2026-10-25-admin-modifications/desktop-preference.png)

[Mobile preference](screenshots/2026-10-25-admin-modifications/mobile-preference.png)

## Explicit receipt-status follow-up

After publishing initial candidate `63d1cc9f`, final review tightened completion
proof to require `action_state.status === true`, rather than merely the absence
of an explicit failure. A missing status cannot become a green confirmation,
even if the read-back value already matches. The published history is preserved;
this is a focused follow-up commit on the same review branch.

All 30 targeted desktop/mobile browser checks passed after this change, including
the new missing-status case with a matching saved value. `ci:quick` and the
production build were rerun successfully. Root/BFF dependencies are unchanged.

## 2026-10-27 — PR #90 CI security prerequisite

Carry PR #88's body-parser 1.20.9 and qs 6.16.1 baseline through an ordinary
merge commit, preserving this feature and all published history. The independent
review base is `dev/bff-body-parser-patch`; return to main after explicitly
approved security integration. No PR is merged into main and no deployment.

Integrated `ci:quick`, fresh root/BFF installs and the BFF production audit passed
locally; the audit reports zero vulnerabilities. The security candidate's full
Nix frontend/BFF and provenance/source/package checks also passed in isolation.
Remote CI on this new feature head is a separate pending result. See
[shared diagnosis and evidence](2026-10-27-ci-security-baseline.md).
