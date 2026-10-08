# Direct payment links in the member overview (2026-10-08)

Status: prepared for review; not merged or deployed. REQ-052.

The administrator's member overview showed incoming-payment numbers in the
recent-payment card as plain text. Turn each existing source number into a
native router link to the same incoming-payment detail used by the member's
Payments tab. Use the incoming-payment ID, not the different user-payment ID.
Manual credits without a source retain their original text without a link.

Keep the administrator-only finance gate and all amount, period and timestamp
formatting. Links are keyboard accessible and have a 44px minimum touch height
on mobile. Browser Back returns to the member overview; the payment detail's
existing Back link continues to open Finance. No route, adapter, API, BFF,
payment data or UI wording changes.

## Verification

The regression checks Czech and English, an incoming source with an ID different
from the credited user-payment ID, a manual credit, keyboard activation, mobile
single taps, the loaded destination and browser Back. It records any unexpected
API mutations and checks horizontal overflow. The spec is included in strict
E2E type coverage and the mobile WebKit project.

The missing source link was reproduced against the deployed dev.crucio.cz
frontend in mobile WebKit. Six candidate browser checks passed across desktop
Chromium, mobile Chrome and mobile WebKit (both languages per project). No API
mutations occurred. Desktop/mobile synthetic screenshots were reviewed.

Pinned Nix Node 24.21.0 quick checks, production build and 23 E2E-coverage/
structural-audit script tests passed. WebKit used the lockfile's Playwright
1.61.0 in an isolated macOS harness with bundled Node 24.19.0. `npm test -- --maxWorkers=4` passed all 1,719 tests in 289 files. The build retains its existing chunk-size warning.

The overview already has a reviewed structural-size exception. Its exact source
hash/allowance was reviewed for this ten-line link addition; the exception's
removal target is unchanged. This task does not expand into a lifecycle-editor
refactor. Browser evidence uses synthetic API/session data.
Candidate HTML/assets are served only inside the test browser on dev.crucio.cz;
this is not a deployment or certification of real payment data. Screenshots
contain only synthetic values. External KB screenshots were not recaptured.
