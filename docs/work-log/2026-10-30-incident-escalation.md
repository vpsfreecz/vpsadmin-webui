# Selected incident escalation on VPS views

The maintainer approved shared escalation for predefined incident types. The
initial registered type is `oomd`, displayed through the API-localized label
“VPS memory-pressure incidents” / “Incidenty přetížení paměti VPS”. This React
package implements REQ-051 on the existing VPS surfaces. It is a review candidate;
no merge or deployment is authorized.

## Supported interface

The existing VPS Index/Show/Update routes expose a selected `incident_policy`.
Counts, warning state and effective/raw limits belong to that type/current owner
epoch. Automatic stop permission, last confirmed stop, cooldown, outstanding
physical action and ownership boundary are VPS-wide across registered types.
The UI states that scope. It neither pools reports nor calculates server counts.
The API's localized label is rendered as text; history uses the selected key.

Reads initially omit new query parameters so older APIs keep working. Numeric
`incident_count_7d` plus returned `incident_policy` detects the released interface;
subsequent list/detail refreshes explicitly carry that selected key. Missing
fields hide all new views and controls without inventing zero counts. The
unreleased narrow OOM-prefixed feature API is not supported as an alias.

The detail card shows per-type counts, limits, mode, warning and incident times;
shared confirmed stop and pending/failed/uncertain action remain distinct. The
cooldown describes the earliest qualifying new incident, never a scheduled stop.
The existing desktop/mobile list indicator uses the registered label and monthly
count/limit; administrator status/exemption filters remain before server
pagination and preserve owner scope. Rapid selections merge against the latest
requested URL and external/Back navigation resynchronizes it.

Only administrator view exposes nullable type-specific overrides and the shared
exemption. Isolated updates include explicit selector and the three settings;
blank limits send null, and save confirmation identifies the VPS and values.
The backend validates final inherited/overridden pairs and rejects mixed
incident/other mutations before effects. The client synchronous allowlist is
limited to a valid selector plus at least one known setting. Supplied async
receipts and unrelated mutations retain their existing strict checks. Fresh
selected-type readback verifies the same key and values before clearing drafts.
Permission/preflight gates, immutable save snapshot and durable lock are retained.

Generic exemption help describes vpsAdmin repeated-incident stops, collection
and warnings. Only `oomd` adds the node memory-protection sentence. Existing
process OOM reports/prevention screens and protocol codenames are unchanged.
No rule editor, extra navigation, action, transport or BFF endpoint is added.
The authoritative backend contract is `vpsadmin/docs/incident-escalation.md`.

## Compatibility and documentation

Deploy matching backend/schema/templates in observe mode before expecting these
controls, then compatible UIs; deliberate enforcement enablement is separate.
Old nodes and ordinary clients remain compatible. Frontend rollback leaves
backend settings and audit state intact. No migration exists in this repository.

The pinned terminology input remains vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The lead directly applied the required
English/Czech writing pass; exact generic/type/settings/shared-state/exemption
copy is used. Existing count/status/cooldown advice keeps its established facts.
The canonical external KB workflow remains
[vpsfree-kb-contracts/docs/webui-change-workflow.md](https://github.com/vpsfreecz/vpsfree-kb-contracts/blob/master/docs/webui-change-workflow.md).
Current contracts/captures certify legacy PHP only, not this React UI. This
package identifies the VPS list/detail/incident guidance impact but does not
publish KB text or claim React certification from legacy captures.

## Review and verification state

The original narrow package and its captures/checks are preserved at
`b67c7917e8758e707e0b88512f055eab9fbd8529` under a retained local original ref;
those results do not certify this replacement contract. Historical captures
are retained with that exact source and in session evidence, not presented as
current shared-interface screenshots.

Root frontend dependencies were necessarily restored offline after the approved
cleanup, solely for TypeScript/Vitest/catalog tooling. This is a new verification
allocation, separate from the historical cleanup. BFF dependencies, builds,
browsers, captures and guests remain held pending capacity release.

Focused adapter/model/rendered tests cover explicit selector/default reads,
invalid/null/empty/selector-only/mixed synchronous acknowledgements, nullable
reset and selected readback, old API capability, rapid/external filters,
owner/admin/support visibility, localized labels and a synthetic second rule.
The latter proves selected counts/limits/history/settings do not silently become
memory-specific or read back another rule; it registers no production rule.
Browser fixture source is updated but no rework browser run is claimed.

The initial six-file focused run had 75 passes and one failure: a new fixture
returned both list and detail envelopes, which the strict adapter rejected.
The mock was corrected to return separate responses; all 18 adapter cases then
passed. Application types, adopted E2E types/coverage, design docs and lint
passed. Formatting initially failed on the renamed E2E configuration; that file
was formatted, then format, locale parity/structure, structural budgets,
component/page/active-document contracts, UI strings and mutation audits passed.
The final rendered file passed all 19 cases after updating the observation-mode
assertion to the current help text and checking the localized API type label.
The source has no new structural-budget exception. Original failed receipts
remain separate from the successful affected follow-ups.

Final consolidated ranges and independent affected review are recorded in the
review handoff. Full original hosted checks remain evidence only for their
original exact inputs. Heavy runtime/browser/build allocation and feature
publication require lead coordination. No deployment, production mutation or
default-branch integration occurred.
