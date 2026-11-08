# Personal dashboard Summary — 2026-11-08

REQ-009/010. The maintainer explicitly approved the prior proposal: rename the
existing My objects panel to Summary, pluralize DNS zones through existing cs/en
catalog plural rules, and add Paid until and Monthly membership fee. Payment
details is an inline link in the date field, not another card or button.

The existing authenticated user.current cache supplies paid_until and
monthly_payment. Account time zone and explicit interface locale drive date
formatting. Existing shared date and whole-unit payment formatters gain optional
locale arguments; existing callers retain their behavior. Zero stays zero and
missing values stay unavailable. No new API or permission is required. The
member response has no currency; match the existing Payments amount rather than
hard-code one or query administrator-only settings. Neutral dates avoid changing
payment-status boundary semantics. Administrator/support My view uses their own
profile; All view retains aggregate resource/dataset counts and its scope label.

The locked terminology source is a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
The existing site override b83b26e1ba1c8e869ae3ffbcb5801ed071c3844e is separate;
no backend input or SDK dependency change. User-specified membership wording is
present in both catalogs. New browser coverage is adopted into strict E2E typing.

Source quick checks,2340 unit tests across358 files,240 script tests,58 BFF
tests and the production build passed. Initial unit catalog-loading setup and
first browser cold-start/overpacked-navigation failures remain recorded. All12
Czech/English plural cases run against the actual I18nProvider; browser cases
cover roles, representative forms, missing/loading/error data, zero fee, account
time zone, focus,320px and no finance requests/writes. Browser acceptance, clean
package verification and preview deployment are pending. The change is prepared for a
focused draft review; no main merge, production activation or KB publication is
implied. Isolated fixtures do not certify live permissions or OAuth. External KB
contracts are owned by the separate legacy-vpsAdmin capture project; review the
reported dashboard/navigation concepts before any documentation release.
