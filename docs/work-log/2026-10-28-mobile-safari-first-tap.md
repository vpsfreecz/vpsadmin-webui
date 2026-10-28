# Mobile Safari: first-tap investigation and clipped lookup choices

Date: 2026-10-28. Requirement: REQ-010. Review candidate, not yet deployed.
Branch: dev/mobile-safari-first-tap, based on main `9113caa0915b`.
The maintainer authorizes a focused PR and deployment to dev only.
Preserve PR97/98 in the current dev preview; do not merge main, change API,
include unrequested PRs or update production.

## Deployed evidence and limits

Observed dev runtime: clean `3f77b8f5720aa821c85e6676228a8880338066e2`.
Existing touch/workflow checks passed 48 cases across mobile WebKit/Chrome
(two desktop-only skips). An additional 20 Tasks/Transactions checks passed
using tap instead of the original mouse click. Menu-to-Tasks transitions
(eight cycles per portrait/landscape context) and scrolled navigation/account
controls passed. These runs exercise the actual served bundle with browser-only
synthetic sessions/API; they send no authenticated mutation to the live API.

A specific failure is confirmed in both WebKit and Chrome: the long owner
suggestion popup in VPS advanced filters extends under the fixed dialog footer.
After scrolling the choices fully, the last option's lower touch area is still
covered by the footer. A raw touchscreen probe there hits the footer rather
than the choice. The browser hit-test regression fails on both engines before
the fix. A first draft checked only the option centre and passed; checking
the lower part exposes the clipped touch target. An exploratory partially
scrolled probe likewise hit the footer; this is not evidence that a click
on a fully visible control was discarded.

The maintainer's precise phone/action is not known. Other first-tap journeys
passed; this finding does not establish that every reported intermittent tap
has the same cause. Playwright WebKit touch emulation does not reproduce every
physical iOS keyboard, zoom, momentum-scroll or Safari-version behavior.

## Implementation

Keep user/node lookups inline in the existing focus-trapped overlay. Bound
the popup by the visual viewport and every clipping ancestor, open upwards
when there is more room, and cap the internal scroll area. Recalculate after
scroll, viewport resize and ancestor resize. Hidden/unlaid-out anchors defer
geometry work until measurable. Preserve query scoping, keyboard selection,
focus/blur and completed-click activation; no global touch handler, early
touch-down submit or synthetic second click is introduced.

The source helper and new browser spec are adopted into lint/format and strict
E2E coverage without changing frozen baselines. Existing combobox unit tests
initially exposed zero-layout jsdom geometry being treated as an offscreen
anchor; defer measurement for empty client rects, also appropriate for hidden
real UI. All three existing unit checks then pass. One fixture run initially
used a different Playwright installation than its copied config; use the
matching CLI. Record final quality/browser/build and dev results below.

No UI text, locale catalogs, API routes, dependencies or credentials change.

## Final source verification

- ci:pr passed: required audits, ESLint/format adoption, app/tooling/E2E/BFF
  types, 226 script, 57 BFF and 1,893 unit tests (305 files), production build.
  Existing large-chunk advisory remains; dependencies were not changed.
- 75 Playwright checks passed with no retries across Chromium desktop, mobile
  Chrome and mobile WebKit; 26 intentional touch/desktop mismatch skips. This
  includes 24 new option hit-test/first-activation cases in cs/en, portrait,
  landscape, desktop and a viewport resized while suggestions are open. Existing
  lookup keyboard/focus, Escape, slow import, scope selection, cancellation,
  migration/error and mobile workflow checks are retained.
- The browser regression first failed against the served old bundle on both
  touch engines, then passed on the candidate. Source tests do not establish
  deployment or a physical iPhone keyboard test.

Implemented candidate captures use synthetic data:

- [Old popup overlapping footer](assets/mobile-safari-20261028/before-mobile.png)
- [Candidate mobile Safari](assets/mobile-safari-20261028/after-mobile.png)
- [Candidate desktop](assets/mobile-safari-20261028/after-desktop.png)
- [Candidate after viewport resize](assets/mobile-safari-20261028/after-resize.png)

PR, exact CI and dev deployment outcomes follow in the deployment receipt.
