# Administrator snapshot and backup removal

Requirement: REQ-048. The requested operation removes all managed snapshot history
from a dataset's source and backup copies, including backup trees and branches.
It preserves the live dataset and existing download files. This is separate from
disable-backups, which preserves backup history, and ordinary plan removal, which
preserves all snapshots.

## Interaction and boundary

The plans page gains an inline administrator card beside backup cleanup, including
when no plans are assigned. It starts with recursion off and disabling plans on.
The read-only preview returns the complete server inventory. Every physical
snapshot location remains visible, including shared backup memberships, non-head
history, closed pools, empty structures and plan remove/retain effects.

Preview is not confirmation. The first deliberate step is the unchecked inventory
acknowledgement followed by Continue. The second is the existing ConfirmDialog
showing the target, options and complete totals. Cancel returns to the unchanged
review. Only the final confirmation submits, once, with the same options and
digest. Changes to options or context clear both confirmations. A known stale
review clears the inventory and retains options for a fresh explicit preview.
Uncertain submission uses existing durable local locks and reconciliation; it
does not start a preview-and-retry loop. Accepted work uses trackActionState and
can continue after navigation.

The Custom manifest boundary validates required types, row identities, joins and
counts without silently skipping data. It does not rebuild backend storage safety
or calculate a digest. Both full authenticated capabilities and the actual admin
role are required. The adapters use generated SDK methods through the existing
transport; no new BFF endpoint, result route or task controller is introduced.

## Dependencies and verification

Locked vpsAdmin terminology source: `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
The lead applied the required user-facing writing pass directly to the English
and Czech catalog additions. The API schema and stale-error representation follow
the backend's version 1 contract. The verified generated TypeScript development
archive is selected in the manifest/lock and Nix importer; a published registry
artifact is required before merge.
Publication, API activation, WebUI merge and deployment remain separate decisions.

Current focused evidence: 114 tests pass across manifest, component, plans-page
and real-generated-client adapter suites. The final full `ci:quick` gate, Nix
formatting and production dependency audit pass; the audit reports zero
vulnerabilities. The component cases cover role/capability
denial, fresh defaults,
explicit false, complete structures/memberships, two stages, Cancel/Escape/Enter,
option/context reset, stale responses, preflight failure and ambiguous/missing
receipts. These are synthetic fixtures and do not certify backend locks, ZFS
ordering, actual deletion or preservation of live source contents.

Generated SDK transport checks pass against the exact retained candidate described
in the [client contract](../design/HAVEAPI_CLIENT.md#generated-vpsadmin-typescript-sdk).
Browser screenshots, independent final review, production build and package
checks are pending. Nothing is merged or deployed. No database or persisted-format migration is introduced here.

The external KB impact assessment follows the canonical vpsfree-kb-contracts
workflow after the exact PHP/UI commits are pushed. React fixtures are separate
evidence and do not certify KB pages or captures. Production KB publication is
outside this change.
