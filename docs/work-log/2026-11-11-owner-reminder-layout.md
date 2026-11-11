# Selected-owner reminder layout (prepared)

The approved UX-03/UX-04 finite audit found the native reminder date shortened
beside Clear at 320 CSS pixels on the current preview. Wrap the local control
group and give the input its native max-content flexible basis, so the action moves to the next
line when a complete native value needs that space. Keep the shared controls,
labels, values, date conversion, confirmation and role/API contracts.

REQ-010 records this local responsive behavior. The existing user-detail browser
spec gains cs/en, light/dark, narrow/intermediate/desktop geometry and keyboard
checks, plus clear/preset/confirmation guards. No mirrored CSS unit test is added.

Baseline, exact working and clean-package verification, hosted CI, paired preview
delivery and final visual review are pending. Captures use intercepted synthetic
actor7/selected owner42, not real permissions, OAuth or a physical Safari/display.
The broad UX-03/UX-04 audit remains partial.

The older focused base also uses the existing medium Clear size, matching the
36px field while retaining the shared44px coarse-pointer minimum. The existing
structural exception keeps its exact allowance after review of these local
presentation changes. Pinned quick checks and build pass in both trees. The
qualified current-clean negative has8 configurations/48width states,38shortened
native-width states and0writes/pageerrors. Original first-probe setup failures
and the older-base32/36px failures remain separate evidence. New working
Chromium reminder4 cases pass at all six widths with complete seconds visibly
present at320. Full corrected topic/mobile, broad Overview and clean-build
checks remain pending; no hosted CI or deployment outcome is claimed here.


## Coarse-pointer follow-up (prepared)

Initial draft head90eba64e had5successful CI checks and2actual mobile Chromium
failures at1440px in English light/dark: native field277.375px versus required
286px. Preserve those logs, traces and the original B65 clean packages; nothing
was staged or activated. Reserve18rem for the flexible input while retaining
16rem grid minima, so the adjacent action wraps before it consumes native width.
The intrinsic-width threshold and mutation guards remain unchanged. New working
verification, clean packages and all6CI on the updated exact head are pending.
The separate Overview receipt probe also retained4invalid synchronous state
fixtures: object-state writes require action_state_id and correctly stayed
uncertain. The qualified synchronous case changes only expiration_date, as
the existing adapter/upstream contract requires. No production guard is changed.


The uncommitted18rem follow-up passed quick/build but was refined before
publication: derive flex basis from native max-content, since coarse-pointer
font size and second-bearing values can need different intrinsic widths. Keep
16rem grid minima. Extend the same intrinsic-width regression to1536/1920px
without lowering its threshold; verify desktop Chromium, Pixel5 and mobile
WebKit on actual builds. New checks are pending.

Native-basis follow-up now passes pinned quick/build in both trees and12/12
actual working browser configurations per tree across desktop Chromium, Pixel5
mobile Chromium and mobile WebKit. Each has8widths through1920px; all96states
report max-content supported and applied. The old Pixel5 failure reproduces2/2
on the exact initial clean B65. New commit/clean Nix/hosted CI and paired
activation remain pending; original negative and controller/fixture limits remain.
