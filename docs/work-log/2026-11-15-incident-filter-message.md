# Incident filters and report reading — 2026-11-15

Status: bounded working change, not published, CI-qualified or deployed.
Approved INC-01 `679313f92bf714b9` and INC-02 `842e9c87360cb022`;
REQ-010 and REQ-051. Existing own draft PR307 retains its pending-router
filter snapshot correction. Its original parent head is
`78e0e97322d0e7ab9d95a4fd3d41c5f1129c57dd`; the cumulative parent is the
actually deployed `6cf7b05dc3ab445ee951cce42a332fd477e25c64`.

## Demonstrated problem and correction

The actual dev assets, with intercepted synthetic API/session responses,
reproduced the approved issues in eight configurations: CS dark/EN light,
member/admin, Chromium1440/mobile Linux WebKit320. The smart field was191px
on desktop and244px on mobile; its available text width was133/186px, while
the long Czech hint measured414/478px. Advanced filters had no visible text.
The report had a448px internal vertical scroller for696px desktop or2661px
mobile content, and detection/reporting metadata appeared twice.

The incident filter now grows into available width and uses the whole narrow
row. A short ID-or-filter hint preserves its actual supported behavior;
examples and exact supported keys remain in the existing help. The Help and
Advanced actions have visible localized labels and44px controls matching
Copy/Clear. Help's question-mark shortcut and all smart parser, applied URL,
pending-router snapshot, owner, cursor, pagination and action callbacks remain.
No general header search or full-text search feature is added.

The detail removes its duplicate header metadata row. The previously unique
reporter is retained in Summary, using the same existing admin-mode link helper
and member/My plain text. Detection and reporting times remain distinct in
Summary; VPS/owner/IP/mailbox/action/CPU context and original destinations stay.
The complete report wraps within the page and grows with its content, without
an internal maximum height or vertical scroll. Line breaks and text remain
unchanged. The existing title state badge and Open VPS action remain.

## Contracts and evidence limits

The actual API22adc/PID1787468 and23tracked contract files were inspected
read-only. Incident Index/Show restrict nonadministrators to their own user and
blacklist owner/mailbox; Create is administrator-only. No API/SDK/BFF/permissions,
query includes, mutation, retry, duplicate lock or uncertain-request behavior is
changed or activated. Fixture role checks are not live authorization proof.

Locked terminology input `a65a4dfeb92a59df4a80a737a20bcbf8558793ff` was resolved
from both source flakes with offline/local-only Nix, builders/hooks/IFD disabled.
Both required guides were read. The standalone KB workflow and repository impact
must be reviewed; these browser fixtures cannot certify external KB screenshots
or physical Safari/displays. No unrelated API pin or KB publication is implied.

The qualified actual baseline is only the immutable v3 program:
`a1eb6bf20e943e3919a97beb8cd4704bdcf6c6a2ee15ee43256d7355f57b5a62`.
Eight contexts/40raws,20selected originals individually viewed; zero retries,
failures, flaky, skips or live writes. Earlier private capture v1/v2 selector
setup failures and original sources/logs remain retained; they do not qualify
as completed baselines or application failures. The original cumulative source's
untracked dependency symlink remains untouched; isolated clones use exact-lock
validated dependencies. Shared API/legacy/old source checkouts remain preserved.

Fourteen new fully strict browser cases cover CS/EN filter hint fitting, visible
labels,44px controls, keyboard help/advanced access, shortcut/filter/clear/ID
navigation and complete report flow. Detail cases cover member, support,
support My, administrator and administrator My, exact text, distinct times,
reporter/context links and absence of unauthorized owner/mailbox links.
Relevant existing incident pagination/navigation, creation-context and layout
checks remain. Actual run results must be appended after execution; required
exact focused quick/units/build, clean local Nix/browser, all6original CI and
fresh paired/protected guards remain pending. No production/newadmin,
API activation, merge/approval, scheduler change or global certificate.

The controlled `IncidentFilters` view forwards existing input/ref/callback props; it has no query, mutation or local state. Its extraction keeps the list route1188lines below the unchanged1225line baseline; the view86lines and detail235lines. No structural budget, ledger or assertion is weakened. KB impact readback confirms the unchanged API/PHP-only source inputs and no React feature pin; no unrelated pin or external screenshot qualification is claimed.

## Working qualification before commit

Both source-specific full quick checks passed before the final pointer-intent
precondition refinement; focused55relevant units and current84units passed,
with both native production builds. The final new e2e file then passed full
strict checking again in each source (115/268adopted, no new deferred allowance).
Both full working browser cohorts passed65cases each:23Chromium,
23mobileChrome and19mobileWebKit, zero retries/failures/flaky/skips. Fourteen
new cases run in each profile; existing smart-filter five cases run in all three,
and the existing four responsive cases retain their source-selected Chromium
and mobileChrome profiles. These cohorts overlap and are not unique totals.
Four additional cumulative native visual contexts/eight raw diagnostics passed
and were individually reviewed; they are not deployed after comparisons.

Original local failures remain retained: new adopted-path sorting, explicit
E2E files versus include registration, a printer-only multiline-array AST
comparison, and two mobile bare-ID expectations after Clear. The original
working browser cohort was45PASS/2FAIL/1interrupted/17notrun. An observational
capture-phase diagnostic repeated the original interaction twice successfully
and recorded the parked pointer inside the VPS suggestion rectangle; it does
not establish the exact original failing Enter state. The final keyboard test
moves the pointer outside, asserts that Open is selected, and presses Enter on
the input. Its expected detail URL and all prior assertions remain unchanged;
no application parser/dropdown/callback, timeout/retry, viewport or budget was
changed. Full original sources/logs/error contexts and the diagnostic are kept.
The complete65case focused rerun and65case current cohort then passed.

Fixed-ref semantic AST validation preserves hooks, helper functions, parser,
query/pagination/navigation callbacks and original reporter values/path helper.
Only the pure duplicated detail metadata memo is removed. The new controlled
view forwards ref/value/suggestions/callbacks directly and has no API or local
state. Critical API/BFF/SDK/VPS/monitoring/lock/pin paths and all structural and
e2e-deferred baselines remain byte-identical to their respective parents.
Exact committed quick/units/build, clean local Nix/source-bound browser and
original hosted CI still remain required before paired activation/publication.
