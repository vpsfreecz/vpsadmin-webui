# VPS Access section and control readability

Scope: approved umbrella TODO UX-04, bounded to VPS Access. Requirements
REQ-009 and REQ-010. No API, role, credential or localization changes.

The three section titles previously shared the body size and were plain divs.
Selectors used the subtle border, with approximately 1.51:1 contrast against
the dark field background. Use the existing strong border for the main cards,
header separators and selectors, and larger semantic h2 titles. Do not increase
all nested borders or add descriptions.

Evidence: synthetic member VPS and public/host keys, CS/EN, light/dark,
desktop Chromium and mobile WebKit. Tests check hierarchy, control boundary
contrast above 2:1 (a regression floor, not a WCAG compliance claim), wrapping,
keyboard focus, key/password selection and opening/cancelling confirmations.
Existing Access workflow and failure fixtures will be rerun against the final
artifact without contacting a real API. Eight working-build cases passed;
eight old-artifact cases failed on missing section headings. Focused Access
unit tests passed (4). The structural ledger only refreshes the reviewed source
hash; its existing line allowance and removal obligation are unchanged. Physical low-quality displays remain untested.

Prepared for a focused draft PR against kerrycek-021126. No approval, merge or
production deployment. Exact build and paired preview receipts are kept in the
canonical operator continuity record; do not infer deployment from this file.
