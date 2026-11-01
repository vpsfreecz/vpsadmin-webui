# 2026-11-01 — Guard original advisory corrections and lifecycle actions

REQ-055 expands original-report administration to draft, published and retracted
advisories while retaining REQ-054 public/admin isolation. The API contract is
owned by vpsAdmin; this UI uses the existing handwritten adapters and unchanged
HaveAPI transport/dependency.

Forms capture the displayed revision, state and related rows. CVE and bulk-node
requests run in sequence and require compatible API capabilities before the first
write. Conflicts and uncertain responses preserve input and completed outcomes. Original corrections stay
silent; explicit announcements keep their existing mail/state/time choices.
Preserve exact/null dates and localized notes. Add confirmed direct retraction
and deletion, with confirmation that deletion permanently removes the report and its history. Refresh related/public caches.

Terminology was read from the locked vpsAdmin input at
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, including both i18n/localization guides.
The runtime/module input is unchanged. API OPTIONS choice maps use machine keys,
not translated labels; initial array-only fixtures were corrected from real API
metadata evidence. A resources-only root fake also exposed the established
single-namespace projection, so wire tests use the actual full root envelope.

Prepared for review, not merged or deployed. The pinned-shell `ci:quick` gate passed, as did 31 focused adapter/admin tests
in 10 files. After the final draft-only readiness fix, affected ESLint, formatting,
frontend types and strict browser-fixture types passed again (94 checked files). Synthetic desktop/mobile
captures show implemented UI and do not prove real API locking, cascade or email
behavior; those are covered by the separately owned API package. Longer full
suites, builds and browser/package checks follow committed-deliverable review.

Upgrade API and UI together before enabling writes, with all sync consumers
updated first. Mixed API pools and old unguarded UI writes are unsupported.
Software rollback leaves corrected content and retraction in place; recovering
deleted content requires a backup. No production operation is authorized.


Synthetic capture evidence: four capture-only cases passed in Chromium desktop
and mobile, in Czech and English. They show the implemented published editor and
an explicit delete confirmation; the capture path stops before mutations. The
final capture asserts the readiness message is absent outside draft. Captures
used candidate `49c4e1626227c9da6a8c68876f157921e7d4ad97`, tree
`088911bf9241015f5ac206c5d5d82d5c415aa08b`, after rebasing onto current main
`63d484fc070dbee633d32624de545e834d483701`. Advisory source, catalogs and browser
specs are unchanged by that rebase; both adjacent API documentation sections
were preserved. Pinned `npm ci`, `ci:quick`, the same 31 focused tests and all
four capture-only cases passed again on that baseline.
This is visual evidence, not completed browser acceptance or real API evidence.

- Editor: [desktop English](screenshots/2026-11-01-advisory-corrections/chromium-en-editor.png),
  [desktop Czech](screenshots/2026-11-01-advisory-corrections/chromium-cs-editor.png),
  [mobile English](screenshots/2026-11-01-advisory-corrections/mobile-chrome-en-editor.png),
  [mobile Czech](screenshots/2026-11-01-advisory-corrections/mobile-chrome-cs-editor.png).
- Delete confirmation: [desktop English](screenshots/2026-11-01-advisory-corrections/chromium-en-delete.png),
  [mobile Czech](screenshots/2026-11-01-advisory-corrections/mobile-chrome-cs-delete.png).


Final review identified two snapshot defects and an outdated published-edit
assertion. Node editors now use the clicked row from the coherent snapshot and
reject removed or replaced rows. Only the original editor uses its captured
advisory and CVEs; announcement dialogs use current data. Rendered regressions
cover fresh-parent/stale-child assessment props, a publication-time correction
followed by an unchanged-date announcement, and cancellation followed by an
external correction. Bulk failure text now requires close, reload and review
before continuing. The published browser scenario keeps Edit and hides Publish.
