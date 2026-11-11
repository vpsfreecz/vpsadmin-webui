# Package form footer alignment — prepared follow-up

Approved UX-03/UX-04 and REQ-010 require coherent field/action dimensions and
alignment. The earlier read-feedback candidate passed 66 bounded browser cases,
but a stronger saved-geometry audit found its pending Cancel/submit tops 3–4 px
apart in 24 width states across 8 configurations. The entire footer was equal
to the actual D9 preview parent. That candidate was never staged or activated.

A fragment left the two inline-flex buttons in a line box aligned by baseline.
Adding the submit spinner changed that baseline. Wrap only this footer in an
explicit flex action group with wrapping and a gap. Preserve query keys, owner
filters, selected values, rejected drafts, pending locks, API payloads and roles.
No shared button/style, localization, SDK, BFF or configuration change.

A regression in the existing strict browser spec covers Czech/dark and
English/light: choose an environment/package, type a note, hold the intercepted
POST, measure equal field/action heights, top alignment and separation at
1280/320/768, reject it, and check the draft and single exact-owner payload.
The 1 px alignment bound stays unchanged. The spec is already in strict E2E
roots; the deferred baseline and compiler flags remain unchanged.

Four negative configurations on the actual D9 package reproduce zero action
spacing and the 3–4 px pending offset over 36 rendered width states. Both pinned
quick/build runs passed. Ten working configurations per branch pass in Chromium
and mobile WebKit: the read/recovery/cached-data contracts plus the new footer
regression. Earlier read/bulk/capture/fixture-setup/143 evidence keeps its actual
source and is not relabelled as this revision. No live mutations occurred.

Clean Nix outputs, current package/browser evidence and all six hosted checks
on the updated PR285 head remain prerequisites for paired activation. Both
broad tasks remain partial with eight scoped groups. Physical-display judgment
and the final result decision remain the maintainer's. No PR approval/merge or
production/newadmin/API deployment is authorized here.
