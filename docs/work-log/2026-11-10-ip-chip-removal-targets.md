# Coarse-pointer filter-chip removal

Approved UX03 `7c773db80dfa673c`; preserve the UX04 color correction.
Continue existing264 from0da3d088, keeping earlier occupancy/heading/chip/metadata
changes. Exact clean2fa source measured both error and selected-version removal
buttons16x16 at390/320 mobileWebKit. The existing shared-button rule requires
44x44 whenever any pointer is coarse, including landscape/tablet widths.

Add the existing shared coarse-pointer minima to FilterChip removal. Preserve
compact desktop16px controls, labels, danger/normal colors and surfaces, query
semantics and original callbacks. Let chips grow and their group wrap; do not
expand overlapping invisible hit areas. No API/BFF/dependency or role change.

Extend the four existing strict source regressions: measure error and ordinary
remove controls at native/320/768, retain actual keyboard error dismissal, then
use a single touch tap at320 to remove only the version chip on coarse devices
(keyboard on desktop). Keep composited contrast checks and block all writes.

Clean2fa was superseded BEFORE staging or activation; preserve its Nix4,16color
cases,35filter+1existing skip/12networking source runs, and any matched artifacts
as bounded historical color proof. Actual paired preview remains8c40ee6, with
protected TODO/source/archive/readback complete for the earlier corrections.
New focused checks/CI, clean current package and paired/TODO verification are
still required for this target follow-up; no broad consumer/task completion.

Evidence: /data/webui-browser-runner/verification-20261103/
todo-ip-filter-chip-targets-20261110, confirmed-target-defect.json. Fixtures do
not certify live permissions, physical Safari or a weaker display. No live
accounts/objects/mutations, production/newadmin or merge approval.

Pinned focused112/175 and integrated219/102 ci:quick/build pass. New source
regressions on clean2fa reproduce4 mobile44px-target failures while4 desktop
cases pass; all8 pass against the focused source. Each observes native/320/768,
both ordinary/error targets and rendered contrast, plus8 actual keyboard error
dismissals and4 actual coarse-pointer taps at320. Original center taps could
work on16px; the negative is size, not an invented lost-tap claim. No new exact
CI or clean-package delivery is claimed by these working-source executions.
