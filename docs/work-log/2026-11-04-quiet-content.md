# Content and state presentation across the WebUI

The foundation record below retains its original dashboard/account/payment scope
and verification history. The [whole-interface continuation](#whole-interface-continuation)
records the later composed domains and their remaining verification gates.

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

| Check                                                                            | Result                                                                                                                                           | Session evidence            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `npm run ci:tests && npm run build`                                              | 239 script tests, 58 BFF tests and 351 frontend test files / 2,297 tests passed; production build passed in 22.97 seconds; batch 88.401 seconds. | `final-tests-build.log`     |
| `content_visibility.spec.ts`, Chromium and mobile Chrome, cs/en                  | Four cases passed with zero retries in 78.940 seconds; 20 candidate PNGs captured for comparison with the matching baseline.                     | `final-capture.log`         |
| Focused Dashboard overview and payment QR/copy cases, Chromium and mobile Chrome | 14 cases passed with zero retries in 68.508 seconds, including bilingual payment coverage.                                                       | `final-focused-browser.log` |

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

## Whole-interface continuation

The composition checkpoint `90fa12fc7086b6ac0efc555c55902b8d339b7231` combines the
accepted domain contributions on `dev/quiet-content` for PR150. Fresh SSH checks
confirmed main at `47b6992e28c16585aa6247bd75413637a7ca6388`. The four published
foundation commits through `6cfe5e1c` remain unchanged; 39 domain commits map to
eight unpublished composed commits. This is a composition checkpoint before the
adoption/documentation commit, not final-head verification. The separate content
policy remains PR149 at `92134c3f`, without policy changes in this UI package.

| Domain                   | Accepted contribution, base excluded | Preserved rationale and evidence                                                         |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Storage/network          | `6cfe5e1c..2b203583`                 | [Storage and network content](2026-11-04-storage-network-content.md)                     |
| Account/finance          | `6cfe5e1c..ab38bbc4`                 | [Account, finance, requests and shared lifecycle](2026-11-04-content-account-finance.md) |
| Compute                  | `6cfe5e1c..597cb8ed`                 | [VPS and infrastructure content](2026-11-04-content-compute.md)                          |
| Operations/shared        | `6cfe5e1c..5d80666f`                 | [Operations and shared content](2026-11-04-operations-content.md)                        |
| Mail administration      | `5e0ee197..9b5c0cf1`                 | [Mail administration content](2026-11-05-mailer-content.md)                              |
| Task/transaction details | `5e0ee197..c864e0c5`                 | [Task and transaction detail content](2026-11-05-task-details-content.md)                |

Operations supplies the common O3 contribution once. Mail and task details supply
only their exclusive tails above `5e0ee197`, without replaying that ancestry.
The authored Dashboard ports preserve Kerrycek's author, email, date and original
PR/source references: PR145 remains `1e123285`; PR136 maps from `b64ee741` to
`66d84349`; PR141 maps from `52a2bbdd` to `5bdd6071`. Original accepted branches
and evidence remain retained. Experimental predecessors and the other open
contributor PRs are not imported. The one overlapping Dashboard header hunk keeps
the final accepted generic-description omission after both authored ports.

The continuation removes repeated introductions, identifiers and routine
reassurance while retaining distinct scope, status, warning, count, timestamp,
consequence and action facts. Unknown/failed child reads remain explicit and
independent parent actions keep their genuine prerequisites. Local recovery,
retained drafts, permissions, full outbound/payload text and exact Copy remain.
The workflow catalog records the non-obvious namespace, lifecycle, mail and task
contracts; the six logs retain their individual decisions and scenario limits.
No new requirement IDs, API contracts, models or query defaults are introduced here.

Changed complete E2E files and eligible shared sources enter the existing strict,
lint and formatting coverage. `TransactionInlineDetails` is actually adopted;
its delivered source is not hidden behind a refreshed deferred hash. At that checkpoint, the initial
E2E baseline, eligible roots, strict flags, rules, structural allowances, scripts,
workflows, SDK and dependency locks remained unchanged. Formatting retains typed
and runtime ASTs, all assertions, payloads and scenarios.

The affected 18 existing unit suites passed all 109 tests. Scoped ESLint passed
for all three eligible shared sources. The scoped format check covered 103
source, specification and manifest files: 34 passed unchanged, and the 69 that
needed formatting passed after normalization. Typed and emitted runtime AST
comparisons confirmed equivalent formatting across all 100 source/specification
files. These checks do not substitute for the composed aggregate or browser
verification.

The retained metrics fixture correction changes only the invalid resolver
relation mock from `inherit` to null before complete-file formatting. The
original compute residual and HEAD blob remain untouched. Wave7's stable
`1a87c0a8` fixture passed in 11.146 seconds. Two existing native frames now show
partial expanded 24-hour desktop charts. The 7-day click and URL transition
passed, but the last recorded frame still shows 24 hours selected; a settled
7-day chart view remains unproved. The frames retain their original
`c417252948b2` bundle identity. No new capture or composed-candidate claim follows.

Domain screenshots and dirty builds retain their original input graphs and
metadata. Their locale/theme/role/crop and synthetic API limits do not disappear
through composition. RootErrorPage remains source-only. O2 retains its legacy
finished/null-status badge and the standalone item Done badge in Czech; the
Tasks inspector supplies no raw prop. Authenticated action-state cancellation
is unimplemented in the locked API, so the mocked rejection/manual retry and
qualified related-transactions namespace error remain synthetic UI evidence. Clipboard stubs,
callback/read-back assumptions and security/publication/sandbox boundaries keep
the limits recorded in their owning logs.

The initial composed aggregate quick and source-coverage jobs were prepared for parent
execution after source/prose acceptance. Independent whole-series history and
migration review, longer tests/builds/Nix/browser checks and exact-head hosted
CI/publication remain later gates. Earlier foundation and domain results are
not relabeled as those outcomes. The complete changed pathset contains no
migrations or schema, protocol, API-contract or dependency changes; migration-plan screens
are UI rather than database migrations. Rollback needs no data conversion or
deployment ordering. No merge or deployment has been performed.

### Aggregate checks and bounded structural continuation

The initial parent quick job passed the locked-toolchain gate, then stopped at
the design-docs audit. Optional manual Markdown formatting had padded the first
cell of each requirement-coverage row, while the unchanged audit requires the
canonical `| REQ-ID |` syntax. Removing only the surplus spaces from those 76
cells preserved every cell value and all other bytes. The affected audit then
passed for 187 documents and 76 unique requirements. The separate source-coverage
job passed with 34 adopted and 55 deferred files. Both original attempts and
their exact input graphs remain retained.

The parent continuation passed lint, required formatting, both i18n gates, CSP
and page integrity, then stopped at the structural audit. The report separated
26 raw violations, nine accepted exceptions, 17 unaccepted violations and 15
invalid entries; no aggregate ceiling failed. Eleven later gates did not run.
These passes describe that earlier graph, not the extracted successor.

The bounded remedy extracts existing presentation from eight pages/components
into nine local modules. Namespace header and rename keep their separate render
positions. Smart-input help keeps its callbacks and input focus in the parent;
the chain header retains the exact items-link predicate. Outage form functions
move together, and its list moves intact. Package header/delete and Help editor
components receive controlled values and callbacks; state, pending guards,
target, reset and mutation ownership stay with their original owners. Dataset
metadata moves only its three administrator flag displays. Static comparisons
cover the unchanged parent state/query/mutation statements, reconstructed JSX,
outage functions and complete list/detail bodies. The local import graph is
acyclic. This is source equivalence evidence, not a typecheck or browser result.

All eight parents meet their non-increasing ceilings. Each new module is below
500 lines and contains no `as any`. The ledger draft removes the newly resolved
outage growth entry and the already expired migration-plan and VPS-create entries.
It proposes current hashes and exact non-increasing allowances for the remaining
12 stale entries, preserving their historical debt revisions, original metrics,
rationale, owner and removal conditions. The nine previously accepted entries
remain byte-for-byte unchanged, as do the baseline, rules and aggregate limits.
The resource-package detail retains its inherited 20-cast ceiling. No new
exception or higher allowance is proposed.

The ledger review remains pending until the lead accepts the exact source and
ledger. Its proposed successor attribution is separate from the original review;
the original reviewer is not claimed to approve these bytes. All nine new modules
passed the scoped formatter. The unchanged HelpBoxes unit suite passed its three
tests. Only the assigned focused checks ran; structural, application and other
aggregate gates await the parent continuation after acceptance. The earlier
environment/coverage results retain their original scope, and affected passed
gates must run on the new graph.

The extraction preserves API, model, provider, query, payload, permission,
recovery and persistent-state contracts. Fixtures, catalogs, type/lint coverage and locks remain
unchanged. Existing raw source/output trees and metadata retain their original
identities. No new build, capture, commit, publication or deployment is claimed;
independent whole-series review and longer checks remain later gates.

After exact source and ledger acceptance, the parent continuation passed 17
gates, including the structural audit and application/tooling typechecks. The
structural report contains 21 raw violations and 21 accepted exceptions, with no
invalid entries, unaccepted violations or aggregate failures. E2E coverage passed with
194 checked and 91 deferred files, then the E2E compiler reported 11 TS4111
errors across six existing specifications. The final BFF core gate did not run.
The bounded repair replaces only those dictionary dot accesses with identical
literal bracket accesses, retaining keys, optional chains, guards, payloads,
assertions and scenarios. All other runtime source and the accepted ledger stay
unchanged. The original failures and 17 passes keep their input bindings; E2E
and BFF core verification remain pending on the repaired successor.

The parent E2E/BFF remainder passed both gates in 28.433 seconds. E2E coverage
remained at 194 checked and 91 deferred files, and its compiler passed. The BFF
core compiler and all six signature-contract tests passed. All 20 required
`ci:quick` gates are now accounted for through the retained locked-toolchain
pass, 17 source-gate passes with accepted access/log equivalence, and the current
E2E/BFF results. The separate source-coverage gate also passed. The original
failed invocations retain their failed outcomes and exact input bindings.

This final log append is the sole change after the checked successor. Runtime
source, specifications, the accepted ledger, dependencies and compiled outputs
remain unchanged. Final commits, independent whole-series review and longer
checks remain separate gates; no publication, integration or deployment follows.
