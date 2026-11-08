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
