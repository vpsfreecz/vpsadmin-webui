# Individual payment values and localized instructions

Prepared for review; not merged or deployed. Follows REQ-052.

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
