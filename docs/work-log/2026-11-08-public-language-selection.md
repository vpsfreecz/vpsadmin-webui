# Public language selection — 2026-11-08

The public language control used obsolete primary color utilities, leaving the
selected Auto, EN or CS without the orange fill used by the appearance control.
REQ-010: use the same accent, contrast foreground and hover utilities, and expose
one selected button with `aria-pressed` in each desktop/mobile control group.
Language resolution, persistence, labels, catalogs and API behavior are unchanged.

Browser verification extends the existing public theme suite: generated background
and foreground colors, exactly one selected language, all three choices, reload,
light/dark appearance and 320/1280px viewports. Screenshots use anonymous synthetic
news fixtures; they do not certify an interactive OAuth session or real API access.
Verification: pinned Node24 source quick checks, all2,344 unit cases and production
build passed. Playwright:27/27 public language/theme/news cases passed across
Chromium, mobile Chromium and mobile WebKit, two workers, zero retries, shared
browser lease. Twelve new appearance/language cases cover four width/theme
combinations per engine. Desktop/mobile screenshots show the implemented header.
No live API mutation was performed. Exact release packaging and paired preview
activation are separate receipts; no newadmin deployment or merge is authorized
for this follow-up.


## CI comparison follow-up

The first full Chromium job at `aef51fc9` ended with951 passed and3 failed new
language scenarios. The UI returned the correct resting orange; the assertion
had frozen a reference sampled while the appearance button was still animating
(e.g. rgba(...,0.957)). It then repeatedly compared settled colors against that
obsolete intermediate value. Mobile Chrome and WebKit jobs passed.

Read both computed background/foreground pairs in the same browser evaluation on
every bounded poll. Retain exact orange, selected semantics, all choices/themes,
reload and viewport checks; no animation suppression, timeout increase, skipped
case or retry workaround. This follow-up changes only the test and documentation;
the deployed application code is unchanged. Verification uses a forced slow-transition red/green probe and the normal27-case
suite. Actual outcomes are recorded in PR223 and the durable
`language-transition-ci-20261108` evidence on the development host; pending
checks are kept distinct from completed application/deployment evidence.
