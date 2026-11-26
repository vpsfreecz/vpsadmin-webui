# Selected-user History view state — 2026-11-11

The approved UX-03/UX-04 finite audit of selected-user History reached56 qualified
fixture configurations on current clean6b0a1af6, covering dimensions, dark/light
readability, both views, queries, read errors, dialogs and pagination. Final
non-color-state inspection found that both view buttons lacked aria-pressed,
aria-selected and aria-current. Strong current-artifact regressions fail in
desktop Chromium and emulated mobileWebKit; the group remains open.

Extract the existing toggle into a small component and add aria-pressed to its
two buttons. The page structural ratchet rejects even two extra lines; extracting
the existing markup keeps it below the unchanged limit. Labels, appearance, owner
query, filters, roles, destinations and pagination are unchanged. The shared
Button already supports the attribute on both the focused13a base and current
preview. Update the existing history smoke test to check pressed role state
through pointer and Space/Enter changes, with no mutation requests, and adopt
that whole spec into strict E2E coverage without relaxing compiler flags or
baselines. No mirror unit test is added for two presentational properties.

Private exact-source evidence is retained under
/data/webui-browser-runner/verification-20261103/todo-history-view-selection-semantics-20261111;
the56 prior audit configurations retain their actual6b0 source in the sibling
todo-selected-history-current-acceptance-20261111 directory. They are not
relabeled as proving the new semantic criterion. Fixtures do not certify live
API permissions, OAuth, native assistive announcements, physical Safari/display
or full WCAG. No visual pixel change is intended; existing genuine comparison
images are retained rather than inventing a before/after difference.

Verification so far: the actual-current negative2/2 is retained; both isolated
sources pass pinned quick checks and builds. The current working artifact passes
16 state/keyboard cases; the older focused working artifact passes the same16
after explicit local-only UI-preference fixture setup prevents its unrelated
automatic migration write. The zero-write guard is retained; original16 focused
migration failures are preserved. The source history smoke passes all three
browser profiles on each working source. Current cumulative local script/BFF
checks and2379unit tests pass. Final quick checks follow the fixture edit.

Both working sources keep the structural baseline and compiler flags unchanged.
The current cumulative compiled stylesheet is byte-identical to actual6b0;
the focused branch retains its older existing classes rather than importing
current preview layout changes. These working builds are dirty artifacts, not
clean Nix or hosted CI certificates. No assistive speech/device certification.
A focused draft PR, clean Nix outputs, exact-head six successful CI checks,
paired preview guards and protected TODO evidence remain separate gates.
No merge, approval, production/newadmin or API deployment is claimed.
