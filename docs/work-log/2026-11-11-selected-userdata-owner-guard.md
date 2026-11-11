# Selected-user User data owner guard

Prepared 2026-11-11. REQ-001; approved coherent workflow/presentation audit.

## Problem and resulting behavior

Support can enter another user's administrative dossier. The shared User data
panel applies the explicit owner only for global administrators. The API returns
only the current account's templates for every non-administrator and blacklists
an explicit owner filter. Consequently the dossier's selected-user heading can
sit above the support operator's personal templates and create/edit/delete UI.

Mount the existing panel only for a global administrator or when the selected
user is the authenticated account. Other support contexts show the existing
localized permission title/body without fetching templates. Administrator owner
filters and create payloads, implicit own-account support scope, member/My
profile and VPS initialization consumers stay intact. No API/SDK/BFF, role,
query, payload, dependency, translation catalog or public route change.

## Source and evidence boundary

The focused source starts at experiment13a39a58bdedbd87be9bc55bf5120e35d4a26c76;
the cumulative source starts at actual paired
62c4e86fae9449474d2a85c3ec7f821d1294401c. Preserve already-delivered changes
and unrelated/held PRs. Draft PR239 addresses a separate length-counter defect;
it does not implement this wrapper guard. Fresh open-PR file review found no
other change to this wrapper.

Existing API source22adc8b54d464e0f899550746b69181930da80fd was inspected:
VpsUserData Index/Show/Update/Deploy/Delete restrict non-administrators to their
own user ID; Index blacklists user input; Create defaults to the current user.
No backend change, schema export, generator update or new SDK release is needed
for this UI guard. Source inspection and intercepted fixtures do not certify
live API permissions or production compatibility.

Two source-faithful baseline browser cases fail on the clean62c package, later
activated on both previews: support7
views selected user42 while the synthetic API returns support-owned template701.
The own template appears under the selected-user hint, with a template read and
no mutation. Desktop EN/light and mobile WebKit CS/dark originals and DOM/query
snapshots are retained. Mobile failure capture does not show the below-fold row;
its DOM snapshot proves presence. No live identity/object/lock was created.

Earlier presentation probes remain separate: initial background-focus targeting
failed behind a correctly trapped modal; a synthetic create response with numeric
user input was correctly rejected until expanded to an included reference.
The subsequent40-case cohort recorded39PASS/1FAIL, normal controller1: an
XMLHttpRequest page error occurred52ms after a mobile WebKit reload began.
The trace is retained; this guard does not claim a browser-unload fix. Actual
filter/clear recovery will be checked separately without ignoring page errors.
Support fixtures returning another user's rows were layout-only and cannot
certify backend scope. No failed run is relabelled as qualified completion.

## Localization and documentation impact

Both existing English/Czech permission strings were reviewed. The terminology
input is a65a4dfeb92a59df4a80a737a20bcbf8558793ff in both branch locks.
No label/key/placeholder or localization algorithm is changed.

The canonical KB workflow and instructions at
vpsfreecz/vpsfree-kb-contracts f97785c2c265172a4c78893e0673034fde56e4dd were
read; the historical vpsadmin-kb-captures URL resolves to that same source.
Its vpsadmin input and semantic landmarks bind the separate legacy PHP WebUI.
User-data bindings cover member profile/VPS management and deployment, not the
React administrative dossier or support-other context. Those member paths,
PHP labels/landmarks and capture scenarios are unchanged. No KB prose, image,
contract revision or production write is prepared. Pinning a React commit as an
API/PHP vpsadmin input would select the wrong repository. This is a scoped impact
assessment, not a claim of a newly run full KB contract/capture or publication.

## Verification and release gates

Add strict owner/role browser regressions for administrator selected/self,
support self/other, both locales/themes and desktop/mobile projects. Verify no
template read/action in the denied context, and retained explicit/implicit owner
payloads in allowed contexts. Run pinned quick/build and relevant component
checks, then current clean artifact acceptance, four Nix outputs, six exact-head
CI checks and fresh paired preview/public/protected evidence guards.

Pinned root/BFF npm ci, ci:quick and production build pass on both source
variants. The new strict owner suite passes24/24 per variant across desktop
Chromium, mobile Chromium and mobile WebKit, CS/dark and EN/light, all four
owner/role contexts. All controllers exit0 without retries or page errors;
18 create POSTs per variant are intercepted, with exact owner/default checks.
All allowed query scopes, including invalidation reads, are recorded; denied
contexts make no template reads or mutations. The allowed panel's source
projection is unchanged after formatting. Current CSS is byte-identical to the
actual clean62c package; the older focused branch keeps its own existing style.

Cumulative244 script,58 BFF and2379 unit tests (360 files) pass. Initial
formatter failure and a strict fixture literal-ID inference error were corrected
through the pinned formatter and an explicit numeric-ID fixture type, preserving
all compiler flags and ratchet baselines. Originals remain outside the repository.
Clean committed artifacts, exact new-head hosted CI and new paired/protected
delivery remain pending. No new deployment is claimed by these local checks.
Fixtures are not live permissions/backend success, physical Safari/display,
native assistive speech or full WCAG. No merge/approval/production/newadmin/API
release is authorized by this record. Broad UX-03/UX-04 remain partial; do not
close the User data group until the complete finite scope and evidence pass.
