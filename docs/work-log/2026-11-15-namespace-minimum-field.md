# Preserve the namespace filter width on narrow screens

REQ-073; approved UX-03, NSP-01 and NSP-03. The explicitly requested final
assistant-run audit found the labeled Czech Help control shrinking the namespace
and map smart field to 169.328px at a 320px viewport on actual dev9d7daaf8.
The existing profile-control regression requires at least 200px; retain that
assertion and every scope/query/action contract.

Give the smart field its full row below the desktop breakpoint and keep Help
first in the wrapping actions group. This preserves the existing 200px minimum
at 320px without introducing an arbitrary width token. Help keeps its visible
label and 44px target. Wider layouts remain inline. DOM order, keyboard focus
and suggestion/filter behavior are unchanged. No API, BFF, localization catalog, permission or mutation change.

Existing namespace-control scenarios now resize both namespace and map fields
to 320px and check the same 200px minimum and document overflow before restoring
the original viewport. Original filter, owner, keyboard, payload, pending and
negative assertions remain. The final audit's old profile-control failures and
raw actual-dev screenshots are retained under /data as evidence.

Update the existing own draft PR240, preserving its history. Verification,
all six checks on the new focused head, clean packages, paired previews and
actual-dev after checks are still pending; this entry does not claim delivery.
No builder access, tenant writes, API activation, merge or production deployment.

Working sources: both full repository quick checks, relevant namespace/API/
pagination units and native builds passed. Eighteen existing positive namespace
cases per source passed on Chromium, mobile Chrome and Linux mobile WebKit with
two workers and zero retries, failures, flaky cases or skips. Both list fields are checked
at 320px for member/support/admin, CS/EN; original scope and action checks remain.
The original local design-audit rejection of an arbitrary width and the corrected
source-count guard are retained as preparation evidence, not passing CI.

A frozen actual-dev program captured four baseline cases/eight unaltered images
on 9d7daaf8 with member CS dark/admin All EN light, desktop 1440px/mobile WebKit 320px.
All eight originals were individually reviewed. These use intercepted API/session
fixtures and no live writes; they do not certify live backend permissions.
Optional captures run within the qualifying clean-artifact suite instead of
rerunning successful cases solely for screenshots. Exact committed qualification,
clean Nix outputs, new-head six-check CI and paired activation remain pending.
