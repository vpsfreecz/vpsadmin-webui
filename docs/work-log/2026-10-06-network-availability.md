# Network availability controls

## Request and contract

The accepted network availability request adds an administrator-controlled
enabled state while preserving existing service and inventory. This change
implements REQ-071 and extends detached-address revalidation in REQ-050.
Public/private classification remains the API network role. No address-range
classification is introduced.

The owning vpsAdmin change adds `Network.enabled`, disabled-network admission
guards and the shared enabled public IPv4 statistic. This frontend consumes the
additive state and action metadata; it does not compute the public counter.
Administrator create/edit sends availability only when supported. Assignment
selectors request the optional `network_enabled` filter and reject explicitly
disabled cached addresses. Owned disabled addresses remain visible.

Older APIs receive no unsupported input fields or filters. Missing state is
unknown, and capability failures remain errors. The backend remains responsible
for current admission checks, ownership, reservations and quota. Previously
accepted operations may finish after disable; existing service continues.

## Documentation and terminology

Updated the network filter and assignment contracts, networking workflow,
requirements and evidence matrix. Adapter inventory is regenerated as part of
verification. The authoritative locked Czech terminology source is vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; deployment configuration can override
that input and requires a separate effective-revision check.

## Structural debt disposition

On 2026-10-06 the root lead reviewed the small address-action extraction and
disabled-network badges in `UserNetworkPage`. Assigned VPS links remain
available; the new guard applies to detached assignment actions. The existing
ledger entry now records the reviewed modified source hash and lowers its
measured allowance from 691 to 683 lines. The historical baseline, original debt
source revision and removal condition of at most 500 lines remain unchanged.
This creates no new exception or increased budget.

## Verification and release state

Initial verification passed 42 tests in five synthetic unit files, including
bilingual network-editor cases and disabled-address actions. The full ci:quick
gate, adapter inventory and documentation audits passed.

Review corrections apply the advertised enabled filter before the 50-row
suggestion limit and retain the local stale-response guard. Capability lookup
failures show an error and a retry action. Cached metadata cannot authorize
availability writes while a lookup is pending, fetching or failed; other fields
remain editable.

After these corrections, six focused synthetic unit files passed with 51 tests.
They cover filtering before the suggestion limit, older APIs, stale responses,
capability failures and retries, and omission of availability writes while
metadata is unconfirmed. The full ci:quick gate passed again, including lint,
formatting, localization audits and application, tooling, adopted browser and
BFF type checks. The design audit checked 68 documents and 71 requirement IDs.
At that checkpoint, browser scenarios had not run and rendered evidence was pending.

Synthetic fixtures are not a live API or deployment proof. Backend
admission/concurrency tests belong to the separate vpsAdmin change. No
integration, deployment or default-interface cutover is claimed.

Browser verification then exposed a NixOS launch failure in the cached generic
Linux browser and incomplete action metadata in the toggle fixtures. Chromium
from the locked nixpkgs input launched successfully. The existing old-API and
disabled-inventory browser cases passed; both toggle cases failed before the
fixture advertised a usable control. The fixtures now retain HaveAPI action
method, scope, input and output metadata and assert OPTIONS selects PUT. The
full ci:quick gate passed after this test-only correction. Desktop and mobile
toggle verification was rerun with the corrected metadata fixtures.

The corrected browser suite passed all four cases on desktop and all four on
mobile with Chromium from the locked nixpkgs input. The English and Czech
captures show the implemented network editor and availability help. These are
synthetic fixtures. The production build passed, with a chunk-size
warning. Logs and the four reviewed captures are available in the
[development session](https://vpsfree-cz.workspace.aitherdev.int.vpsfree.cz/2026-10-05-network-ipv4-left-counter/).
No live API, deployment or default-interface cutover is claimed.
