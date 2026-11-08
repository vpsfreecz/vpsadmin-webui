# News publication field action — 2026-11-08

Approved UX-03 (`7c773db80dfa673c`), REQ-010 and REQ-053.

The actual ce3 preview editor measured a 36px date field beside a 32px Set now
button on desktop. Both existing Czech and English labels wrapped to a 37px
text range within the 32px box. Mobile already used 44px stacked controls.

Use the shared medium button size and protect the existing label from flex
shrink and line wrapping. Retain copy, date conversion/handler, drafts, role
scope, API and submission behavior. Three financial hints were vertical forms,
so they provide no evidence for changing their compact standalone actions.

Before evidence: `/data/webui-browser-runner/verification-20261103/`
`todo-admin-field-presentation-audit-20261108`, exact ce3f9f6b, eight fixture
cases/16 states. This is rendered presentation, not live permissions.

Verification and paired preview activation remain pending for this new change.
No production/newadmin activation, PR approval or merge is authorized.
