# Dashboard servers hosting my VPS

The maintainer requested an optional overview view limited to servers hosting their
VPS. Add a native All servers / With my VPS selector directly to the authenticated
cluster card. Default remains all; the choice uses the existing account-backed
UI settings and normalizes old/invalid settings to all without resetting other
preferences. Anonymous public status remains independent.

Own membership always targets the signed-in account, even in admin All view.
Use the existing generated VPS Index with explicit owner and node/user includes,
abort signal and bounded full keyset traversal (200 rows, up to 20 pages). Count
metadata never substitutes for reading the membership collection. Reject unknown
owner/node, non-advancing or incomplete pagination and unavailable owned public
status; do not present partial results as healthy or empty. Match stable node IDs,
not names. Keep stopped VPS included. This is a display choice, not an API gate.

Only the cluster card's locations, rows, heatmap candidates and availability
summaries follow the selection. Global warnings, resources, density, collapse,
role-gated node links and administrator inventory remain unchanged. New query keys
include account identity, so a different account cannot inherit the prior set.
A failed lookup can retry or return to All servers. No mutation occurs except the
existing UI settings save. No SDK, BFF, backend or dependency change.

REQ-009/010/054. Localization procedure and locked vpsAdmin terminology guides
were read at a65a4dfeb92a59df4a80a737a20bcbf8558793ff; effective site reference
b83b26e1ba1c8e869ae3ffbcb5801ed071c3844e has identical guides. Both CS/EN labels
and empty/error states are added. No legacy KB route or managed page changes;
new React-control captures do not certify old KB screenshots.

Prepared source in an isolated branch based on verified integration6cd32cfb.
The focused draft will stack on the unchanged account-controls branch at6cd32cfb
to keep this request separate when the combined preview branch advances.
Initial unit run found two fixture expectations: the new default field was absent
from an old exact object, and a test beforeEach accidentally returned a cleanup
function. Corrected those, preserving all assertions; rerun24 unit tests pass.
Existing UI settings provider tests also pass7. Strict ci:quick passes with198
adopted E2E leaves /110 deferred, normal lint40 and design docs262/76. The changed
settings model is properly adopted into normal lint coverage; only its old deferred
entry is removed, without resetting another hash or allowing new debt. Normal
Prettier formatting resolves the inventory formatting stop. BFF working build
passes; a final rebuild includes explicit manual query retry behavior.

Browser fixtures cover four roles/views, CS/EN/themes, full late-page membership,
owner isolation, persisted reload, keyboard/touch targets, collapse and four
empty/error/foreign/missing states. Actual browser/clean-package/CI/paired-preview
acceptance is pending. Shared browser capacity is occupied by the already authorized
serial worker; no extra AI worker or browser bypass is introduced.
