# Readable lifecycle titles and date validation

Prepared2026-11-11; approved UX-04, REQ-010.

## Concrete problem and change

On the clean prepared lifecycle-wrapping artifact02108f9d0c8287043af6abdcdb54158feb8081fd,
six destructive action-index titles14px/600 and the invalid expiration error
12px/400 measure3.121473612768009:1 on the actual dark surface. The supplemental
finite smoke finishes10PASS/4FAIL; every failure is this contrast assertion,
without geometry, page-error or mutation failures. The standalone red error
class is shared by expiration, reminder and the member's custom snooze date.
The actual paired runtime remainsbbb081cbbe8c71785e21050df990ab54f1dbdd72.
These exact prepared-versus-running sources are not interchangeable.

Use the existing text-fg token for action titles, keeping their explicit names,
existing danger borders, keyboard links and grouping. Use the same readable
foreground for the three date errors, with medium weight and a separate left
border marker. Keep the existing localized wording and12px size. The Alert
component already uses normal foreground with danger backgrounds/borders.
The danger-fg token is black in dark mode because it belongs on solid danger
buttons; using it on this dark page would make readability worse. Do not change
the global palette or reduce the4.5contrast check for these small labels.

Only two runtime files change. Date parsing/seconds/timezone handling, input
values, validation conditions, roles, payloads, confirmation, API/SDK/BFF,
localization catalogs, dependencies and routes remain untouched. No new feature
or model choice. Member self-service and the shared administrative user/VPS
lifetime editor retain their existing contract. Border/weight provide additional
error grouping; explicit error text already conveys meaning without color.

## Existing work and source boundaries

Focused dev branch uses requiredkerrycek-021126 at13a39a58bdedbd87be9bc55bf5120e35d4a26c76;
cumulative branch starts at prepared021, preserving separately focused draftPR291
value wrapping. That candidate has not yet been deployed. Fresh upstream review
confirms main88ac13b89d6421c914cd57e18153de1fee6fc7b7/base13a.

Aither64 PR150e0abf399b2c96eb5a5e2e2cdaab46e1680b96bf6 removes generic explanatory
content from both touched components. Its full paginated patches leave the
standalone danger text classes unchanged. Preserve its separate review and all
current content; do not import, modify, merge or rebase it. Our openPR280
b24db0a3df57a10d3d2aba05a5a7b35d95a10b96 fixes timestamp equality in different
runtime files and has no overlap with these class changes. Preserve both scopes.

## Verification and remaining release gates

A meaningful strict browser regression samples computed text and composited
ancestor backgrounds, not CSS class names. It covers all12 action titles and
both administrative date errors plus a custom member snooze error, CS/EN,
light/dark, widths1280/768/320, Chromium and mobile WebKit. Unsupported opacity
or background-image contexts fail explicitly. Invalid drafts keep Save disabled;
restore the actual original valid field strings, cancel dialogs without submitting,
and follow the action link by keyboard. Record errors and all writes; authenticated
API responses are intercepted, so no live permission/backend-success claim.
Raw captures use the same fixture/data/fixed clock on exact before/after sources.

Keep original negative baseline traces and private tooling errors separate from
qualified results. Adopt the source test into strict type coverage and required
mobile WebKit. Run pinned dev-shell npmci, quick/type/design/script/BFF/unit checks
and build. Four clean Nix outputs/provenance plus all six exact focused CI checks
and original hosted logs without failed/flaky precede any paired preview change.
Recheck current authorization, runtime, API/OAuth/config/loaded credentials,
identity/groups/BFF lock/other processes and paired rollback before activation.
No PR approval/merge, production/newadmin/API deployment or scheduler change.

The whole finite Lifecycle group remains open until all remaining states, roles,
layout/focus, normal and labelled software visuals, paired preview checks and
protected TODO publication/readback pass. UX03/04 remain partial; this patch
alone does not certify network/storage or the approved functional queue.
Computed nominal contrast and software simulation are not fullWCAG, physical
Safari, a weak physical display or native speech. Final visual judgment is human.
No new live identity/object/DB lock; the existing private TLS ledger is retained
until all serial controllers end, then cleaned by exact UID/device/inode guards.

## Local verification completed before commit

The exact clean021 negative baseline completes24 configurations:12light pass,
12dark fail with108 contrast violations, all3.121473612768009:1; zero retries,
page errors, writes or timeouts. All three date-error sites render. A first
private member fixture used a nonexistent /overview suffix and was stopped;
the corrected route is the actual VPS index page. Preserve its original logs
separately; no runtime defect/pass is inferred from that setup error. Initial
private type lookup and source JSON-format checks were corrected without
changing assertions, timeouts, retry policy, compiler rules or debt baselines.

Both focused and cumulative working variants pass24/24 configurations with
360 nominal text samples each, CS/EN, light/dark, Chromium/mobileWebKit and
1280/768/320px. Page errors, writes and retries remain0. Invalid date drafts
keep submission disabled, real valid strings restore cleanly, dialogs cancel
and keyboard action navigation works. Working provenance is parent+dirty,
explicitly distinct from the forthcoming clean committed artifact. Emitted
cumulative CSS is byte-identical to actualBBB and prepared021; the needed
shared utilities already exist.

Pinned root+BFF npmci and quick/type/design/build checks pass on both sources.
Cumulative244script/58BFF/2379unit tests in360files pass. Additional private
finite lifecycle/picker probes compile under the complete source E2E flags
after explicit index-signature access and known fixed-RGBA non-null typing;
these typing-only corrections change no executed expression or check.
The full300configuration bounded matrix, final clean package, fresh exactCI,
paired activation and protected readback remain pending. No whole-group or
broad-task completion is claimed.
