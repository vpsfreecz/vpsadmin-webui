# Transaction table follow-up

Date: 2026-10-27. Requirements: REQ-010, REQ-051.
Status: prepared for review, not merged or deployed.
Branch `dev/transactions-table-followup`, based on main `9113caa0915b`.
Independent of Tasks PR97; no changes from open PRs #63/#74.

## Maintainer request and decisions

- Remove the repetitive User column from member and admin My-view chain tables.
  Keep it in administrator mode. Owner/session scoping and API queries stay intact.
- Failed/fatal chains already use the semantic danger row; preserve and verify
  that actual full-row tint. Add orange warning tint to pinned chains, with failure taking precedence.
  The 2026-10-28 review removes the extra Pinned badge to keep row height stable. Pin/unpin remains on the same row and
  now exposes its pressed state; persistence and pinned ordering are unchanged.
  Scoped transaction-table CSS uses existing opaque alert background tokens for
  warning/error rows (including hover): the general blue-theme row blends looked
  grey/purple on inspection. No global palette/token changes.
- The individual-items shortcut retains its paged route and API filters. Its
  table now matches the chain-step presentation: ID, operation, node/VPS, state,
  duration and an expansion chevron. Creation time and a chain-detail link sit
  under the operation. Full timestamp/type/priority/dependency metadata and
  input/output appear through the shared `TransactionStepDetails` reader.
- Retain node/type/chain/VPS filter pivots and direct node navigation in expanded
  details. API operation labels stay primary; remove the repeated raw-name and
  classification stack from the compact summary. Raw transaction JSON remains
  available. Successful items are neutral, active/error tints remain semantic.
- Share responsive visible-column counting between chain steps and item rows so
  WebKit expansion cannot create phantom columns at mobile/tablet breakpoints.
  Item badges use the current translator instead of relying on a global fallback.

No backend/BFF/dependency, API query, authorization, pagination or polling change.
Terminology guide revision already read for this checkout's unchanged locked
input: `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. No new translation keys.
External legacy-PHP KB publication is not certified by these React fixtures.

## Verification and captures

Passed locally using Node 24.21.0/npm 11.19.0 (pinned fallback toolchain):

- `npm run ci:quick`: all documentation/quality/security/localization audits and
  strict typechecks; adopt the existing item-pagination and new follow-up spec.
- `npm run ci:tests`: 226 script, 57 BFF and 1,893 unit tests (305 files).
- `npm run build`: production BFF-mode frontend; existing large-chunk warning.
- 76 targeted Playwright checks across desktop Chromium, mobile Chrome and mobile
  WebKit, including chain/item pagination, personal/support guards, pinned rows
  beyond the page boundary, chain detail/steps and authoritative API labels.

Synthetic browser coverage includes member, admin My view and admin
mode in cs/dark and en/light; actual computed row colors, pin persistence and
unpinning, failure priority, compact items, keyboard expansion, exact copy,
filter-link semantics, responsive colspan and route navigation. These tests are
not live API authorization or deployment evidence.


The first browser draft used a nonexistent payload selector, then an ambiguous
Copy selector (the failure summary has its own Copy). Scope copying to the named
Input reader's containing panel. An interim regression run passed 54 cases and
failed two legacy fixed-link-count assertions; replace the count with explicit
visible item-ID/title links, open expansion, and verify the retained scoped
user/VPS pivots there. The final 76-case run passes without changing guards,
backend queries or weakening cursor/owner assertions.

Implemented screenshots below use synthetic data; no production member data or
credentials are captured. Review candidate only, not a deployed revision.

Six additional capture runs passed after the final screenshot instrumentation;
runtime source is unchanged from the 76-case run.

- [Member view, desktop](assets/transactions-followup-20261027/member-desktop.png)
- [Administrator view, desktop](assets/transactions-followup-20261027/admin-desktop.png)
- [Compact items, desktop](assets/transactions-followup-20261027/items-desktop.png)
- [Expanded readable payload](assets/transactions-followup-20261027/items-expanded.png)
- [Member view, mobile](assets/transactions-followup-20261027/member-mobile.png)
- [Items, mobile Safari](assets/transactions-followup-20261027/items-mobile-safari.png)


## 2026-10-28 maintainer review

Remove the Pinned badge: orange row tint and the crossed pin/unpin control are
sufficient. Pinning must not increase the row height. Show count and percentage
for every known progress value, including completed/failed chains, as requested
from the legacy UI. Widen the desktop state/progress column to avoid avoidable
wrapping. Regression fixtures use 10/10 and compare heights before/after pinning
for successful and failed rows in both languages and all three browser projects.
Current dev preview `08154f07c9bd` predates this follow-up; PR update is not a
production deployment or main merge.

Follow-up verification: ci:pr passed (226 script, 57 BFF and 1,893 unit tests
plus production build). Thirty targeted Chromium/mobile Chrome/mobile Safari
checks passed, including equal successful/failed row heights before/after pinning,
cs/dark and en/light, owner modes and explicit 100%/33% terminal values. The first
run exposed the old UX assertion that deliberately hid terminal percentages;
update it to require the requested value while still forbidding completed bars.
