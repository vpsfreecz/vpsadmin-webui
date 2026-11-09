# Readable preference synchronization errors

Approved UX-04 / REQ-010 missing-mode inspection found 12px regular error
text at2.650:1 on the dark preference synchronization summary. Actual clean4ce
fixture reads and rejected reset operations reproduce the result in Chromium
and mobile WebKit; the English light sample is5.547:1.

Change only that existing error span's class list to semantic foreground,
medium weight and an independent2px marker. Preserve translations, sync state,
retry/reset/theme controls, persistence/auth scope and API payloads. This is a
presentation change; it does not change the error outcome or security policy.
Colleague PR150 does not modify ProfilePreferencesCard; use a separate browser
regression instead of editing overlapping existing security/profile tests.

Current missing-mode audit72/72PASS includes144widths,56actualfocus observations
and40expected intercepted writes on exact4ce. Server preference32-case audit
also passed:64widths and16expected intercepted writes; smoke8/8overlaps. Counts overlap smoke and retain their real source.
The targeted regression covers both themes/languages and member/admin own
aliases, three widths, unchanged message/independent retry and keyboard controls,
and zero writes. Source checks/prototype/focusedCI/cleanpackages/pairedrelease
remain pending and must be recorded as they finish. No live permissions, native
OAuth/hardware, physicalSafari/display or fullWCAG assertion. Both broad tasks
remain partial; no production/merge/approval or full-queue completion.

Pinned npm ci, ci:quick (113 strict E2E files), build and design audit passed.
The exact clean4ce controlled test fails1/1 on2.650<4.5. The current-preserving
one-class dirty4ce prototype passes8/8 and24contrast measurements, minimum
9.974; unchanged message/retry/theme/keyboard behavior,0writes. Two actual
320px engine samples were opened. These are prototype/source results only;
no clean Nix, exact CI, preview activation or full broad-task closure yet.
