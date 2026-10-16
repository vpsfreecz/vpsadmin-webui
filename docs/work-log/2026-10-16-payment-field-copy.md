# Individual payment values and localized instructions

Prepared in [PR52](https://github.com/vpsfreecz/vpsadmin-webui/pull/52);
not merged or deployed. Implementation commit `dcc179e0`. Follows REQ-052.

Members can copy the bank account, IBAN, BIC, variable symbol, message and
monthly amount separately. Compact icon buttons use the shared clipboard helper,
keyboard support, touch target sizing and success/failure feedback. Bank account
and IBAN whitespace is removed, variable-symbol leading zeroes are preserved,
and amounts exclude the currency and period (decimal comma becomes a decimal
point). Unknown rows and ambiguous amount formats do not get a copy action.
The existing whole-instructions copy remains available.

The sanitized HTML is rendered as memoized React elements so these actions can
reuse CopyButton. The existing sanitizer remains the trust boundary; raw source
attributes are never forwarded. Loaded QR nodes survive unrelated activity and
copy feedback, including the prior scroll regression. The shared renderer also
provides the actions in administrator member payment instructions.

The known invoice paragraph now selects podpora@vpsfree.cz for Czech and
support@vpsfree.org for English. Czech bank-message guidance uses informal
address even when an inline code element splits the sentence around /VS/53.
The code element and actual member ID are retained. No API or bank configuration
is changed.

## Verification

- Node 24.21.0; Nix is unavailable locally, so the pinned Nix shell was not run.
- Terminology reviewed at locked vpsAdmin revision
  a65a4dfeb92a59df4a80a737a20bcbf8558793ff via the exact Git object.
- Unit suite: 1,823 tests in 297 files passed.
- Application/adopted E2E type checks, lint, scoped formatting, i18n, CSP,
  structural and component-contract audits, production build passed.
- All 18 browser cases passed (12 QR cases and six copy cases); the corrected
  copy cases were rerun in all three browsers. Browser tests cover Czech and English, CZK/EUR, exact clipboard write values,
  first-tap activation, keyboard activation, failure feedback, horizontal
  overflow and QR identity. Desktop Chromium, mobile Chrome and mobile WebKit.
  The first run caught a test expectation using the wrong existing Czech failure
  label; the assertion was corrected to the catalog's "Kopírování selhalo".
- Browser data and QR contents are synthetic local fixtures; clipboard writes
  are intercepted for deterministic assertions. This is not a live bank transfer,
  dev deployment or real API lifecycle certification.
- The external KB contracts checkout is unavailable; KB review is not claimed.

Screenshots: [desktop](screenshots/2026-10-16-payment-field-copy/desktop.png),
[mobile](screenshots/2026-10-16-payment-field-copy/mobile.png).

## Reproducing the focused checks

From the repository root in the supported Node environment:

```sh
npm ci
npm test -- src/pages/app/payments/PaymentInstructionsHtml.test.tsx src/pages/app/payments/PaymentsModel.test.ts src/lib/sanitizeHtml.xss.test.ts
npm run typecheck
npm run typecheck:e2e:core
E2E_START_SERVER=1 node scripts/playwright.mjs test e2e/specs/app/payment_qr_images.spec.ts --project=chromium --project=mobile-chrome --project=mobile-webkit
npm run audit:design-docs
```

The test file is already part of the adopted E2E type coverage and mobile WebKit
selection. The full unit suite and production build were also run as recorded
above. CI results belong to the PR checks; local results do not imply CI success.

## Documentation review follow-up

The maintainer requested complete accompanying documentation. Added the
per-field normalization, clipboard feedback, locale behavior and renderer scope
to the lasting Payments and finance workflow, expanded the evidence-matrix
coverage description, and linked this record to PR52. The other current PRs
(49: export copy placement, 50: hostname fallback, 51: About/build version) each
include requirement/workflow documentation, a change record and screenshots.
No merge, deployment or external KB update is implied by this documentation pass.
