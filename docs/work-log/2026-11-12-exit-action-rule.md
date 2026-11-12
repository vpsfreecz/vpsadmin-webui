# UX-07: name exit actions by their effect

Approved TODO reviewVersion: `a2812ff37e67d3a0`, human revision333.
Related requirements: REQ-010, REQ-020, REQ-048.

The approved audit asks for a rule distinguishing Back, Cancel and Close, checked
in dataset creation and the VPS console. Document the effect-based rule in the
design handbook and workflow catalog. The audited controls already express the
intended effects, so this focused change updates documentation only.

## Audited implementation and finite evidence

Audit source/package: clean `c9f2ec59f58977523994342221e452feae6f9662`, observed on
both authorized previews before this documentation change. This document does
not claim this focused branch contains all cumulative preview changes.

| Scene | Accepted configurations | Verified effect |
| --- | --- | --- |
| NAS standalone creation | 12 | Header/footer Cancel return to NAS; draft discarded; no create |
| Dataset child creation | 12 | Cancel/Escape/backdrop reset draft, preserve route and restore opener focus |
| VPS console | 12 | Size toggle preserves session; Overview navigates; cancelling replacement performs no additional token create/delete |

Each scene covers CS dark and EN light, member/admin My/support My, desktop
Chromium and mobile WebKit at320px:36 unique configurations,72 exit observations.
Accepted records have zero retries or page errors. Twelve intercepted initial
console-token creates occur; no dataset create, session delete or live write.

The standalone page has no existing dirty-navigation blocker. Child dismissal
resets its form, errors and mutation state. Preserve those observed contracts;
do not claim a confirmation already exists or add one through this wording audit.
Console Original size/Fit controls alter presentation, not navigation or session
revocation. The console confirmation Cancel keeps the existing session.

## Retained failures and limits

Initial cohort:35 passed/1 failed, an access-control XHR page error during an
artificial full navigation before list requests settled. Intermediate standalone
cohort:0 passed/12 failed because a full-URL regex rejected normal pagination
query normalization. Both originals are retained. The final standalone flow uses
the rendered NAS list/create link and checks the pathname while preserving href,
no-write, draft/reset, error and viewport assertions. The other24 accepted records
and their assertions remain unchanged. No application/logger suppression.

This is synthetic intercepted browser evidence, not certification of live API
permissions, OAuth, real console lifecycle, physical Safari or unsaved-change
protection beyond the inspected contracts. The original rapid-navigation fixture
limitation remains documented; it was not established as a production defect.
No visual before/after exists because no rendered control or runtime changed.

## Review and publication state

Local evidence is retained under the dated UX-07 audit directory on the remote
development host, including finite-matrix.json, source-proof.json,
finite-acceptance-outcome.json and original browser records. Protected TODO
result publication and final readback remain pending. No task completion or human
approval is set by this documentation commit. No runtime deployment is required
for these documentation-only changes; both previews retain the audited C9 build.

Local documentation validation: pinned Node24/Nix design-documentation audit
passes (257 routes,64 API modules,174 documents,76 requirements); git diff
whitespace checks pass. There is no declared commit hook framework in this
checkout. No runtime files, route declarations, dependencies or tests changed.
