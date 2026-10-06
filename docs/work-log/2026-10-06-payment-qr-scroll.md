# Payment QR stability while scrolling

The maintainer reported QR flicker while scrolling after a separate generator
quiet-zone improvement, and requested reproduction and testing on dev.crucio.cz.
This follows REQ-052. Production deployment is not part of this fix.

## Cause and change

On deployed clean `78a723f7d8c609e05f9de7189ff35416747bafdc`, trusted wheel/touch activity
updates the inactivity deadline (preferred session length 2400 seconds). That
updates auth context and re-renders the payments page. PaymentInstructionsHtml
memoized the sanitized string but created a new `dangerouslySetInnerHTML` object
every render. React therefore replaced the complete instruction DOM, including
already decoded images. Lazy loading and decoding of each replacement can flash
an empty QR box. The same component serves member and administrator instructions.

Keep the innerHTML prop identity stable while the sanitized HTML is unchanged.
Changed instructions/amount URLs or translated text still update. Sanitization,
CSP, API payloads, inactivity tracking and PNG bytes are unchanged. The separate
quiet-zone change supplies 740-pixel PNGs from the generator; embedded fixtures
without that change also reproduce the bug, so quiet zone is not its cause.

## Evidence and status

- Before fix: all eight dev-origin regression cases failed (desktop Chromium and
  mobile WebKit, cs/en, embedded/external QR). Each detected a disconnected QR
  DOM node after session activity and scrolling. The browser loaded deployed assets and used
  synthetic session/API responses; no real payment/user mutation was performed.
- Regression coverage checks node identity and decoded state across repeated
  direction changes with inactivity tracking enabled. Component tests also check
  unrelated parent updates, changed payment amount URLs and language changes.
- Prepared fix; the dev validation outcome is recorded below.

Pinned Node 24 verification passed: 34 focused unit/sanitizer tests, application
and adopted E2E type checks, lint, scoped formatting, structural/component
contracts and design-document audit (73 documents, 70 requirements).


## Dev validation — PR24

[PR24](https://github.com/vpsfreecz/vpsadmin-webui/pull/24) contains the fix.
Only dev.crucio.cz was updated to clean paired frontend/BFF revision
`9d560424fd3d42afaaae85837c04fc2d7fddea7d`. The test-only follow-up `2cc57a8`
does not alter runtime code. Newadmin and clankerdev were rechecked and remain
on `78a723f7d8c609e05f9de7189ff35416747bafdc`; the PR is not merged.

The clean production build passed. Matching artifact manifest, BFF process path,
nginx configuration, runtime settings, unchanged nginx/systemd hashes and auth
endpoint smoke passed. Credentials and sessions were retained. The prior paired
`78a723f7` release and private pointer receipt remain available for dev rollback.
Staging uses `/data`, preserving the host's unrelated services and full root disk.

The first mobile test incorrectly attempted Playwright wheel input, which mobile
WebKit does not support. Corrected touch tests send a trusted tap to refresh the
same activity handler and scroll the viewport separately. Desktop cases use real
wheel input. Longer synthetic tables now ensure actual movement in both directions;
tests assert movement before checking image identity and decoded state.

For the final pre-fix comparison after dev promotion, only the test browser was
served the retained original index and matching freshness response, using old
hashed assets still retained on dev. That avoids the update guard reloading the
new version mid-comparison. All eight corrected baseline cases failed on the QR
node assertion. This comparison did not roll back the host or alter API data.

API/session data are synthetic browser fixtures. The separate live-image cases
use current public generator URLs with synthetic amount/reference values under
dev's real document CSP; they do not use a member's payment data or initiate a
payment. Dev's pre-existing certificate exception is retained for these checks.

Final result: all 24 checks passed without retries on the deployed dev candidate
(desktop Chromium/WebKit and mobile Chrome/WebKit; Czech and English).
Sixteen cases used embedded/external synthetic PNGs; eight used the current real
CZ/SK 740 x 740 generator images, including their quiet zones. All retained the
same decoded QR nodes during repeated scroll/activity cycles. The public host's
build provenance and anonymous auth smoke also passed.

The full GitHub CI runs separately; its status is not inferred from these focused
checks. No merge or production deployment is included in this dev-only outcome.

Reviewed captures show deployed dev JavaScript with synthetic API data and
non-payment test QR contents: [desktop](assets/payment-qr-scroll-20261006/desktop.png)
and [mobile](assets/payment-qr-scroll-20261006/mobile.png). Both capture runs also
passed the scroll regression. Screenshots record layout; DOM-identity/decoded-state
assertions establish stability through repeated activity and scrolling.
