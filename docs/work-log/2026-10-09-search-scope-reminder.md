# Remind privileged users of My-view search scope (2026-10-09)

The maintainer requested a visible nudge when entering member IDs while still
in the personal view. Prepared independently of console PR35 on canonical main
17855e0, for REQ-001, REQ-070 and keyboard/mobile REQ-010.

The shared yellow reminder appears in the header results popover and mobile/
keyboard command palette whenever a privileged account searches in My view.
It explains that the search covers only owned services and offers the existing
explicit administrator-view switch. Showing it for names and IDs, even with
owned matches, avoids guessing that a number must be a member ID. Empty/help
searches, ordinary members and administrator mode do not show it. Search scope,
API permissions and the mode-switch route mapping are unchanged; the command palette retains its query across the explicit switch, while the
inline header retains its normal navigation reset. Header blur retains focus inside the popup
so keyboard users can activate the reminder button.

Czech/English wording follows locked terminology/API source
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; the resolved store guides were read.
No API, backend or deployed-site changes. Browser evidence uses synthetic
fixtures. External KB captures have not been republished.

Verification and screenshots follow. Prepared, not merged or deployed.

## Verification

Pinned Node 24 `npm run ci:pr` passed, including all quick audits/type checks,
226 script tests, 57 BFF tests, 1,770 Vitest tests and the production build.
New browser coverage checks Czech/English reminders, an explicit view switch,
no early administrative search, ordinary-member exclusion, support scope,
empty/help inputs and opening owned results. All five scenarios passed across
desktop Chromium, mobile Chromium and mobile WebKit. The 14 existing cold-search
regressions passed in desktop/mobile Chromium. Initial mobile test navigation
was corrected to check the retained command-palette query instead of trying to
open a second dialog behind it; this was a fixture expectation, not a second tap
required by the product.

Keyboard users can Tab into the switch action and Escape back to the input;
moving focus within the popup no longer schedules its dismissal. The new spec
joins strict E2E coverage (44 adopted, 211 deferred). The original immutable
baseline is unchanged. The build's existing large-chunk warning is informational.

Implemented UI, synthetic data:

- [Desktop reminder](../design/images/search-scope-reminder/desktop.png)
- [Mobile reminder](../design/images/search-scope-reminder/mobile.png)

This is not live API or deployment certification. GitHub checks and review are
separate from the pinned local evidence above.
