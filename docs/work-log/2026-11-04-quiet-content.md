# Quiet routine dashboard, account and payment content

Prepared on `dev/quiet-content` from main
`47b6992e28c16585aa6247bd75413637a7ca6388`. No merge or deployment is claimed.
This record covers REQ-040, REQ-052 and REQ-054; the existing IDs and other
acceptance criteria remain intact.

## Scope and provenance

The dashboard port is limited to Kerrycek's published
[`d8cefb68`](https://github.com/vpsfreecz/vpsadmin-webui/commit/d8cefb68d06d9085b388976583561c5433e358f6)
from [PR145](https://github.com/vpsfreecz/vpsadmin-webui/pull/145). Port commit
`1e1232854c807b9625f25cf7671e4772e01f4658` preserves the original author and
authored date with a source-commit trailer. Its four experimental predecessors
were excluded, and the original branch/PR was untouched. Narrow conflicts in
the root log, requirements and browser type-coverage files retained main's
current contracts and adopted fixtures. The port's added/removed lines match
the selected source delta after accounting for main's different REQ-009 context;
no experimental public-theme/sidebar requirements were imported.

The port removes the nominal alert, duplicate cluster subtitle and collapsed
summary, and presents one neutral online/total ratio. It includes
`DashboardPage`, `DashboardPageStatus`, `DashboardOperationalCards`,
`DashboardWidgets`, the cluster card unit and dashboard browser assertions,
cs/en key cleanup, and dashboard spec adoption in `tsconfig.e2e.json` and
`scripts/fixtures/e2e-type-coverage.json`. Original CLU-01 documentation remains
as contribution provenance. This follow-up places current dashboard acceptance
under REQ-054 rather than locale/theme REQ-009.

The new dashboard guard keeps successful but incomplete data visible: zero
reported nodes, unknown node status or unclassifiable outages cannot reach the
silent branch. Empty outages with known available nodes are valid. Existing
loading/error/current-outage/down/maintenance precedence and the outage link
remain. Focused render tests feed raw node/outage snapshots through the actual
page classification and summarization, then rerender transitions to known health
and back to unknown. Collapsed cluster details retain issue and unknown counts.

Account security omits the generic read-only subtitle and aggregate ready
badge/healthy sentence. Individual controls, values and descriptions remain;
recommendation, limited-access and locked-account aggregate feedback is unchanged.
The model still constructs ready catalog keys dynamically, so those keys remain.

Payments removes only the generic page description and monthly-payment subtitle.
Payment ID usage instructions, accepted-payment history qualification, paid-until
status, API instructions, copy/QR, sanitization, locale handling and all
loading/error/empty/history behavior remain. Only the three now-unused subtitle
and description keys are removed from both catalogs.

The lead completed the final bilingual wording/fidelity pass. The shared partial
notice now describes unavailable status data without attributing successful empty
responses to a fetch failure. The terminology input is locked vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Verification

Package checks used the pinned `nix develop` toolchain. Dashboard checks ran on
`f3e13bd594d8963664567cab119e8cf14bd70954` plus the Dashboard working changes;
Account/Payments checks ran on port head `1e123285` plus that package. These are
not final committed-head results.

- Dashboard: `npm test -- src/pages/app/DashboardPageStatus.test.ts
  src/pages/app/DashboardPage.test.tsx
  src/pages/app/DashboardClusterHealthCard.test.tsx
  src/pages/app/DashboardOperationalCards.test.ts`: four files, 20 tests passed.
  Covers loading/errors and severity precedence, incomplete inputs, page
  transitions and outage link, and retained collapsed cluster issue counts.
- Account/Payments owner: `npm test --
  src/components/user/UserSecurityPostureCard.test.tsx
  src/components/user/UserSecurityModel.test.ts
  src/components/user/UserSecurityPanel.test.tsx
  src/pages/app/payments/PaymentsModel.test.ts
  src/pages/app/payments/PaymentInstructionsHtml.test.tsx`: five files,
  57 tests passed. Five new card cases cover ready profile/admin facts and
  recommendation/limited/locked warnings.
- Account/Payments package catalog checks: `audit:i18n` passed with
  en=cs=8398; `audit:i18n-structure` and owned-path whitespace checks passed.
- `audit:design-docs` passed: 181 documents, 76 unique requirements, 257 routes
  and 74 API modules. Dashboard owned-path whitespace checks passed.
- Port whitespace checks passed. No hook framework or active non-sample hooks
  were declared; no hooks were bypassed.

### Final local verification and review

The following local runs passed at clean code head
`c417252948b293f3b9acc2f25f04c8594cf60416`, using the pinned Nix environment:

| Check | Result | Session evidence |
| --- | --- | --- |
| `npm run ci:tests && npm run build` | 239 script tests, 58 BFF tests and 351 frontend test files / 2,297 tests passed; production build passed in 22.97 seconds; batch 88.401 seconds. | `final-tests-build.log` |
| `content_visibility.spec.ts`, Chromium and mobile Chrome, cs/en | Four cases passed with zero retries in 78.940 seconds; 20 candidate PNGs captured for comparison with the matching baseline. | `final-capture.log` |
| Focused Dashboard overview and payment QR/copy cases, Chromium and mobile Chrome | 14 cases passed with zero retries in 68.508 seconds, including bilingual payment coverage. | `final-focused-browser.log` |

Earlier quick audits and the post-fixture-correction source, tooling, E2E-core and
BFF-core type checks passed. Independent final review of the complete UI branch
through `6d2a4dbbb85a51bb406cfbcd8bb682d47a908c73` found no Blocking or Important
issues. Accepted Advisory A1 removed only the second sentence from the two
partial-status translations: an unclassifiable outage may have no visible details
card or link. The lead inspected that narrow deletion and the replayed history
through `c417252948b293f3b9acc2f25f04c8594cf60416`; the later capture commit's
patch was unchanged. Catalog and formatting checks passed after the deletion.
The reviewed original head remains retained in the review receipt.

Browser tests and captures use synthetic accounts and intercepted API fixtures;
they do not certify a real API, OAuth flow or deployed release. Visual inspection
of all 20 before/after pairs (40 original PNGs) passed with no new defect,
clipping, overlap or overflow. This light-theme synthetic comparison is not a
human usability assessment.
Required remote CI remains separate and will be reported through the final PR
checks. No merge or deployment is claimed.

## Compatibility and recovery

No schema, API/SDK/CLI, protocol, authentication model, browser preference format
or Nix input changes. No deployment ordering or data conversion is needed;
reverting the UI changes restores presentation without a data rollback.

The architect's KB mapping check found no mapped React/newadmin capture contract:
KB default `f97785c2c265172a4c78893e0673034fde56e4dd` pins legacy vpsAdmin
`942c6eaed41331f823d8e0f670ed239e2b308440` and PHP navigation paths. This is a
bounded mapping result, not proof that every external article is current.
No KB pin, capture, staging or publication change is included.
