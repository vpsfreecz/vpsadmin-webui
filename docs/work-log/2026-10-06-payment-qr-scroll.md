# Payment QR stability while scrolling

The maintainer reported QR flicker while scrolling after a separate generator
quiet-zone improvement, and requested reproduction and testing on dev.crucio.cz.
This follows REQ-052. Production deployment is not part of this fix.

## Cause and change

On deployed clean `78a723f7d8c609e05f9de7189ff35416747bafdc`, real wheel input
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
  DOM node after real wheel input. The browser loaded deployed assets and used
  synthetic session/API responses; no real payment/user mutation was performed.
- Regression coverage checks node identity and decoded state across repeated
  direction changes with inactivity tracking enabled. Component tests also check
  unrelated parent updates, changed payment amount URLs and language changes.
- Prepared fix; final checks, dev-only validation and PR reference follow below.

Pinned Node 24 verification passed: 34 focused unit/sanitizer tests, application
and adopted E2E type checks, lint, scoped formatting, structural/component
contracts and design-document audit (73 documents, 70 requirements).
