# Open additional VPS configuration from Resources

Approved TODO RES-04, reviewVersion `2c121d1636216a2a`, 2026-11-09. The
maintainer explicitly requested trying the expanded default and checking the
administrator view. REQ-023 and REQ-010 apply.

Resources previously supplied a closed native details element, hiding these
fields on entry. Use the same open default as Configuration, retaining manual
collapse/reopen and draft state. Remove the now-unused child prop. DNS deep-link
focus, field order, role gates, save/review callbacks and API contracts remain.
No preference is stored and opening does not submit a mutation.

The existing resource workspace browser scenario now expects visible fields,
edits a hostname, collapses by pointer and reopens by keyboard, then checks the
draft. Exact packaged role/theme/mobile evidence and preview delivery are pending;
source checks alone do not certify deployed behavior or live API permissions.

## Query-only entry correction

Preactivation browser inspection found that a static React open prop preserves
a manually closed details DOM node when the resource query changes to general
Configuration. Original e03 opens that transition; initial candidate412 does not.
Reset only the disclosure default when the location key changes, keeping the
existing DNS focus effect and every field draft. The existing workspace scenario
now navigates through the real More menu after collapsing and checks open state,
retained hostname and zero intercepted writes. Candidate412 is rejected before
activation; its initial68-case fresh-document evidence remains separately scoped.
New exact-head CI and clean query-entry verification are required.
