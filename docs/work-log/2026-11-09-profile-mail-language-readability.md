# Readable account mail-language lookup errors

Approved UX-04 / REQ-010 presentation audit found the existing language lookup
failure at 3.121:1 on the ordinary dark card (14px regular red text). The current
clean95 fixture diagnostic reproduces that value in Chromium and mobile WebKit;
the English light sample is 5.973:1. These are synthetic own-account reads, not
live API permissions or a physical display assessment.

Change only the existing message's class list to semantic foreground, medium
weight and an independent 2px danger marker. Keep its translation, query state,
notification toggle, save gate, user/recipient scopes and payloads unchanged.
The generated SDK/current preview import contracts take precedence during any
later integration. Colleague PR150 affects mail panel/recipient copy and the old
mobile spec, not this settings-card class; use a separate regression file.

The targeted browser test measures both themes and languages, member/admin
own-account aliases, three widths, keyboard focus, unchanged independent local
toggle and zero writes. Full baseline 88 account-mail cases remain separately
sourced to clean95, with original fixture corrections retained. Source checks,
prototype browser, focused PR/CI, clean integration and paired release outcomes
must be recorded as they actually complete. This candidate is prepared only;
no merge, production activation or full broad-task completion.

Verified before the focused commit: pinned npm ci, ci:quick (113 strict E2E
files) and production build passed. The old clean95 controlled test fails on
3.121 contrast; the source-equivalent dirty13a prototype passes8 cases/24 width
and contrast measurements, minimum11.746. These are not clean-package or
deployed-candidate results. The full clean95 baseline retains80 initial passes
and8 incorrect generic-error-title failures; immutable12 followups replace8
using the actual section titles and improve4 existing language-error captures.
The accepted union is88 unique cases/176 widths/80 actual focuses/24 explicitly
intercepted writes, zero live writes. Original failed inputs/logs/traces remain.
Initial source checks started before npm ci completed and failed dependency
resolution; after installation, the next check exposed unformatted tsconfig.
The final unchanged-contract checks pass after normal formatting; no source,
security, time-budget or retry waiver. Exact CI and paired release remain pending.
