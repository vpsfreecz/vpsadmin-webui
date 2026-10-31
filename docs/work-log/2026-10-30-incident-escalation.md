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

## 2026-10-31 — Reviewed source and scoped browser correction

Independent final application review covered all four lanes at
`55a813b44edb915c7ed5ce68366d6d797a551606`, with no React finding and an explicit
coherent-history/no-migrations conclusion. The lead released postreview execution
after verifying the separate backend timestamp finding's narrow correction.

The first scoped browser run at that React source remains 10 passed, one failed
and one not run. The mobile combined-filter case exposed a second URL writer:
pagination normalized an earlier filter URL while the next selection was pending.
Passing the existing effective limit into each reset made its URL canonical, but
the affected follow-up still had one pass and one desktop failure; its remaining
old-API command never ran. The desktop trace then showed deferred router state
losing the first selection despite the canonical URL.

The bounded final correction also uses the existing `flushSync` navigation
convention, committing each filter update before another control navigates.
It preserves unrelated query parameters, page/cursor reset and external/Back
navigation. It changes no shared pagination implementation, API, permissions or
receipt behavior. Negative-before guards, 21 focused cases, final filter cases,
types and affected audits passed. The lead directly inspected the narrow diff
under the review skill; no full unaffected review or test rerun was required.

Both affected desktop/mobile overview cases and the previously not-run mobile
old-API case passed with retries disabled. The accepted fix was folded into the
single application commit `4343a02cb13ba42ae50a3276715f1c8e5b7765ea`; its complete
tree `4bee7d1455f35cd422fc385fafda18486f6ee3ea` equals the successful staged-source
browser tree. Native Vite servers ended, with no listener on the selected port.
The original failed results remain failed; these are scoped follow-ups, not a
complete final-source 12-case rerun.

[Four implemented synthetic captures and provenance](screenshots/2026-10-31-incident-escalation/README.md)
show English desktop/Czech mobile detail and corrected desktop/mobile combined
filters. The eight unchanged detail passes retain exact `55a813b4` scope; detail/
component/adapter/catalog hashes are unchanged. Czech mobile retains that capture
source. English desktop was recaptured at `4343a02c` with a two-line capture-only
scroll reset so its heading/history link remain visible; that existing case and
affected E2E types passed. The list pictures come from the corrected tested tree.
Missing unrelated fixture data are not backend proof. The companion evidence
commit contains Markdown/PNGs and the two capture-fixture lines, with unchanged
runtime/toolchain and remaining test files verified separately. Existing feature
assertions were retained.

At capture time, exact published-head hosted checks remain pending. The required
full test suites, production build and dependency audits are supplied by the
automatic PR workflows; no duplicate full local `ci:pr` or BFF dependency restore
is performed. Actual terminal results are recorded on PR115 and in the owning
session evidence. Nothing was merged or deployed, and fixture results do not
certify backend enforcement, accounting, transfer privacy or mail delivery.
