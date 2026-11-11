# Backup Center detail navigation — prepared

Approved BAK-05 `0c6d44640d50433d`, human revision333, REQ-048.

The existing Center Open links discarded their source tab/filter. VPS-dataset
details then had no active member menu; NAS detail switched to NAS. Preserve
only URL presentation context, mark the existing Backups item and provide a
fixed in-app return. Keep that context on detail tabs and reload. Direct member
VPS dataset URLs highlight VPS; direct NAS and administrator behavior remains.

Whitelist Center tab, q, dataset, intent and existing backup_snapshot_* keys;
exclude arbitrary redirect, API owner and action keys. No API, BFF, gate, role,
request, payload, menu structure or dependency change. NAS-14's broader models
remain for the maintainer to choose. Existing CS/EN nav.backups wording is used;
locked terminology input a65a4dfeb92a59df4a80a737a20bcbf8558793ff and both guides
were read. KB contracts currently pin the separate legacy PHP interface; no
React KB screenshot certification or production KB write is claimed.

Pre-commit pinned native full ci:quick, production build, explicit touched-file
ESLint and 46 targeted units passed in both source copies. The new public E2E
file is strictly typed and explicitly selected in mobile WebKit. Private final
focused8 and additional overview/plans8 passed with zero retries, page errors or
writes; they overlap the earlier 32 passing configurations. Final clean-package
44-case acceptance and hosted six-check/paired/protected delivery remain gates.

The initial private run (2 pass/7 fail/1 interrupted/26 unrun) invented a
requirement to transfer detail-tab-local page/limit parameters. Its correction
then had32pass/4fail: workspace return correctly retained the pre-existing auto
backup_snapshot_page=1. Tests now capture the settled exact Center URL. All old
runs/traces remain; these were new assertion mistakes, not fixed product bugs.
Only our exact Playwright controller was interrupted. No runtime change was
made to accommodate either incorrect assertion.

Further verification is in progress. The exact clean A4DE deployed bundle reproduced the
lost backlink/query and VPS missing-menu state in four desktop Chromium/mobile
WebKit fixture configurations, zero errors/writes/retries. Initial exploratory
captures precede list settlement; the second settled baseline is the comparison
source. Candidate tests cover Center downloads and workspace entry, reload,
detail tabs, keyboard return, member/admin-My/support-My, CSdark/ENlight, direct
NAS/VPS/admin links and URL input boundaries. Fixtures do not prove live API
permissions, OAuth or physical Safari. Prepared only, no activation or done claim.
