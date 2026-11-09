# Align shell close controls — prepared

Approved UX-03 `7c773db80dfa673c`, REQ-010. Exact clean37 child-presentation
audit records a36px desktop command-palette Close action beside its44px
search input. Mobile already uses44px for both. The progress panel's raw
icon close control is32x32px with a coarse pointer, while shared footer
controls are44px high. Long Czech labels, loading/read-failure/progress,
app/admin and normal/320px layouts retain their recorded source.

Set only the palette Close action to shared large size. Use the existing
shared ghost Button for progress Close, retaining its32px desktop footprint,
localized name, test identity, callback and icon. Shared coarse minima give
it44x44px and the established keyboard-focus treatment. The embedded palette
help icon remains32px inside its44px field on fine pointers and44px on coarse
pointers. It is a nested icon, not a neighboring field.

No copy, polling, actions, tracking, API, auth, locks or query contract changes.
The focused branch retains already deployed PR243. The current-preserving
prototype retains clean37 and its PR249 search error changes. No duplicate
mirror unit tests are added for these two presentation corrections.

Evidence: /data/webui-browser-runner/verification-20261103/
todo-appshell-child-presentation-20261109. All API responses are intercepted
fixtures; one intercepted start trigger only exposes progress presentation.
This is not a live operation or a repeat of accepted UX02 lifecycle checks.
Pinned source checks, measured current prototype, clean Nix packaging, exact
six CI checks with zero failed/flaky browser cases, matched desktop/mobile
images, guarded paired activation and protected TODO readback must be recorded
separately before deployment. Whole-AppShell and broad UX03/04 remain partial.
Physical Safari/weaker displays and final visual judgment remain human limits.

Current37-preserving prototype32/32PASS,40states/80normal-and320px observations,
80actual affected-control focus/rings,24intercepted start triggers,0livewrites/
failed/flaky/retries. Both contexts/CSdark/ENlight/twoengines. Palette Close44;
progress Close32fine/44coarse; visible controls dismiss correctly. CSS bytes
match clean37. Focused pinnedquick/typecheck/build/design and1939existing
unit tests/309files pass. This remains dirty prototype evidence, not clean
packaging or deployment. Original40baseline configurations retain clean37.

Visual review of the first clean5a caught a squeezed desktop close glyph:
shared horizontal padding leaves less room than the raw icon control. Keep
the16px glyph non-shrinking and assert its actual16x16px geometry alongside
the control sizes. The first clean32 pass did not cover glyph geometry and
therefore does not accept that candidate for activation. Retain its images
and logs; update the same focused draft without rewriting its history.
