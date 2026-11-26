# API contracts and compatibility

Requirements: REQ-018–023, 035–055, 059, 071. Source of request details is the checked
adapter plus the matching deployed backend revision, not a guessed legacy form.
[Adapter inventory](IMPLEMENTATION_INVENTORY.md) gives all current entry points.

## Cross-cutting contract

HaveAPI resources return envelopes and metadata. The client configures version,
metadata namespace and authentication header. Preserve typed failures, validation
messages, permission errors and transport ambiguity. Never equate missing/failed
data with an empty successful collection or silently broaden owner scope.

For each endpoint change review: method/path; supported filters; input units;
nullable/missing fields; role/ownership; ordering/cursor; success receipt; error
body/status; transaction/action-state behavior; cancellation/idempotency limits.
Frontend/server versions are independent and must be recorded together for live
claims. Local adapter tests verify serialization, not deployed backend capability.

| Contract | Implemented/required behavior | Evidence and caution |
| --- | --- | --- |
| UI settings | Generated Index filters by namespace/key and Set writes the JSON-string value at `/webui_user_settings/{namespace}/{key}`. Only the canonical configured resource path (optional trailing slashes) is supported; invalid paths fail before binding/dispatch. Namespace/key are encoded once by the generated client. | [adapter](../../src/lib/api/webuiUserSettings.ts); collection PUT + POST fallback caused the persistence bug fixed by PR519. |
| Session JSON | Same-origin JSON with accessToken, sessionKey, sessionExpiresAt; anonymous values null; no secrets in executable config. | [server](../../bff/server.js), [auth](../../src/app/auth.tsx); retain origin/security checks. |
| New OAuth session identity | The authorization-code exchange sends one validated callback `req.ip` in `Client-IP` and exact `User-Agent: vpsadmin-webui`; invalid IP fails before provider contact. Refresh and revocation use that User-Agent without Client-IP. | [BFF contract](../../bff/README.md), [server](../../bff/server.js); this describes new session metadata, not retroactive changes or browser authorization identity. |
| Resource overrides | Explicit admin override only where backend action supports it. | PR503; do not infer that every create/edit endpoint accepts one universal flag. |
| Custom soft deletion | Admin lifecycle PUT for the supported future lifetime transition; member uses normal DELETE. | PR518; do not send invented expiry parameters to DELETE or use a delete-then-edit race. |
| Hard deletion | Explicit privileged mode; disregard a leftover soft-expiry draft. | PR518; validate actual backend permission and receipt. |
| Console entry | Acquire/reuse console token through existing API; bounded request on entry. Read-only ConsoleToken Show checks current validity every 15 seconds; router traffic alone extends the sliding expiration. Never infer current expiry from the original Create timestamp. | PR517; do not create unbounded replacement sessions during polling. |
| Registration reconsideration | Derive supported actions from actual request state/created-user constraints. | PR510; a generic state dropdown must not advertise unsupported transitions. |
| Effective timezone | Resolve actual account/server timezone when account field is absent. | PR502; Europe/Prague is a real zone ID, not a hardcoded label for all accounts. |
| Node heatmap | Use configured legacy base URL, validated node FQDN/type/maintenance eligibility. | [URL model](../../src/lib/nodeHeatmap.ts); missing config omits unavailable actions. |
| News translations | POST `/news_logs` and PUT `/news_logs/:id` use the `news_log` namespace with `en_message`, `cs_message` and `published_at`. English is required; empty Czech removes its translation. Read-only `message` is localized and must not be used as an English editing fallback. | [adapter](../../src/lib/api/newslog.ts), [browser contract](../../e2e/specs/app/admin_newslog.spec.ts); backend source inspected at locked `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, not a new live certification. |
| Async mutations | Require an appropriate action-state receipt, then track completion. | [action states](../../src/lib/api/actionStates.ts); success without required identity is uncertain. |

## Intentional capability and filter limits

These are the checked frontend contracts at the handbook baseline, not a new
certification of every deployed API version. A field displayed on an object is
not automatically a supported list filter. Pagination and includes metadata are
separate from filtering; filtering only the loaded page must not be presented as
a search of the whole collection.

| Collection             | Supported filter boundary                                                                                                                                                                                                                                                                                                | Source / regression entry point                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exports                | Owner (`user`); no global text, dataset, snapshot, host or state filter in this adapter. Detail-by-ID is a separate request.                                                                                                                                                                                             | [adapter](../../src/lib/api/exports.ts), [fixture contract](../../e2e/specs/app/exports_filter_contract.spec.ts)                                                                                                     |
| Networks               | `location`, `purpose` and optional exact `enabled` when supported by the API. The current list search exposes location/purpose only. Do not forward text, IP-version, role or managed-state filters merely because those attributes exist on a network.                                                                  | [adapter](../../src/lib/api/networks.ts), [adapter tests](../../src/lib/api/networks.test.ts), [URL/filter fixture](../../e2e/specs/admin/cluster_networks_filter_contract.spec.ts)                                  |
| Migration plans        | `state` and `user`; no free-text query. This does not limit the separate destination-node picker for a VPS migration.                                                                                                                                                                                                    | [adapter](../../src/lib/api/migrations.ts), [fixture contract](../../e2e/specs/admin/migration_plans_filter_contract.spec.ts)                                                                                        |
| Transaction items      | `transaction_chain`, `node`, `type`, `success`, `done`; no item-name/text search. Transaction **chains** have a different contract which does accept `name`, as well as state, object and user/session filters.                                                                                                          | [both adapters](../../src/lib/api/transactions.ts), [item-filter fixture](../../e2e/specs/app/transaction_items_filter_accessibility.spec.ts)                                                                        |
| User namespaces / maps | No text or label search. Namespaces support `size`; maps support `user_namespace`. Owner filtering, and namespace `block_count`, are exposed only in admin scope with admin fields enabled and no fixed owner. Removing an invalid/disallowed URL filter resets cursor/page.                                             | [scope/URL rules](../../src/components/userNamespaces/userNamespaceFilterSemantics.ts), [fixture contract](../../e2e/specs/app/user_namespace_filter_contract.spec.ts)                                               |
| Resource packages      | Adapter filters are `environment` and `user`, not package-label text. Assignment history uses the existing `UserClusterResourcePackage.created_at` output, not the definition timestamp or `updated_at`; no new request or API mutation is needed. Global/personal/all scope normalization is handled by the list model. | [adapter](../../src/lib/api/clusterResourcePackages.ts), [model](../../src/pages/app/admin/cluster/ResourcePackagesListModel.ts), [model tests](../../src/pages/app/admin/cluster/ResourcePackagesListModel.test.ts) |

These test links are verification entry points, not a claim of a fresh live run.
Any extension needs a verified endpoint contract and scope/pagination regression
coverage; adding a search input alone does not establish server support.

### Node creation versus editing

The [node lifecycle model](../../src/pages/app/admin/nodes/NodeLifecycleModel.ts)
keeps role, location and bootstrap CPU/memory/swap capacity out of the edit payload,
although they participate in creation. Updates contain only changed `active`,
`name`, `ip_addr`, `max_tx`, `max_rx` and `max_vps` fields. Blank optional limits
must not become zero. The generated update contract does not permit null limits,
so clearing a populated limit rejects the edit before dispatch. An already-unset
limit is omitted; real zero values remain valid. See [model cases](../../src/pages/app/admin/nodes/NodeLifecycleModel.test.ts).
Do not infer editability from the create form or silently add unsupported update
fields when reorganizing the node page.

## Production HaveAPI client

The generated `vpsadmin-typescript-client` constructs operations and live
root/action descriptions. [Generated client bindings](../../src/lib/api/sdk.ts) supply
separate public/authenticated clients at the configured, already-versioned API
base, including any mount prefix. The [request policy](../../src/lib/api/apiRequestPolicy.ts)
receives the complete `RequestSpec` and returns the complete `RequestResult`.
Output namespace, headers, signal and timeout survive this boundary. The installed
HaveAPI runtime owns XHR, query/body encoding, JSON parsing and envelope validation;
WebUI does not decode a second envelope or guess the client's output namespace.

Authentication and language are read for each authenticated dispatch, including
impersonation. Explicit request headers survive; the current authentication
header takes precedence over a stale supplied credential. Separate anonymous
clients do not inherit runtime authentication or language, renew sessions or
perform description discovery for ordinary public operations. Public bindings use
configured metadata first, then valid supplied metadata or a namespace already
discovered anonymously for the same API base; they do not discard custom
metadata receipts or start discovery on behalf of a public operation. BFF session and
OAuth requests remain separate protocols.

A supplied window description or configured auth header and metadata namespace
avoids discovery. Otherwise generated anonymous `api.describe()` reads the root
on the same mounted/versioned base. This executor never waits for authenticated
discovery, preventing recursion. Discovery fields used for authentication and
metadata binding are checked at runtime; generated declarations alone do not
validate application data. Failed/malformed discovery does not authorize a
requested operation; its original error/receipt remains as the binding error
cause. Since only anonymous OPTIONS was attempted, this does not mark an
operation that has not been dispatched as an uncertain write. Clients are scoped by resolved API base, public/auth policy
and effective metadata namespace. Namespace overrides are passed to the generator,
which maps canonical object metadata keys and preserves the raw envelope. Names
that collide with generated action fields or reserved names fail before dispatch.

Only a validated OAuth HTTP 401 rejection may recover the same BFF session.
Concurrent reads share renewal and retry once with fresh authentication and their
original inputs, language and request options. GET and OPTIONS may retry; rejected
writes may renew but require explicit resubmission. Changed identity, logout,
impersonation, HTTP 403, malformed 401 responses, transport loss and abort keep
their established safeguards. A changed API base cannot reuse a stale binding
with new credentials.

[Shared errors](../../src/lib/api/apiErrors.ts) preserve API validation details,
request context and contradictory HTTP/envelope evidence. A protocol error or an
HTTP failure containing a successful API envelope remains an uncertain mutation;
the original runtime error and available full receipt remain attached. A generated
`ClientInputError` proves pre-dispatch failure and is distinct from transport
`TypeError`. Domain [output narrowing](../../src/lib/api/apiOutput.ts) keeps
`data`, metadata, envelope and HTTP status together. Rejected post-dispatch
application output raises `ApiOutputError` with that receipt and remains uncertain.
A required asynchronous receipt must still be validated before tracking completion.
An action with an empty output declaration retains its declared namespace: VPS
Start returns vps:{} plus blocking metadata. Missing namespace is a protocol
failure; a valid empty output with no required action-state ID is a distinct
missing-receipt failure. Neither permits an automatic duplicate mutation.

Every vpsAdmin operation now uses the generated client. The historical generic
wrapper and single-namespace projection are removed. Domain view types derive
from generated outputs, retaining nullable/absent fields and partial associations;
each workflow validates the identity and fields it actually needs. Existing
[actual-package fixtures](../../src/lib/api/haveapiRequestClient.test.ts) feed
serialized replies through controlled XHR. Mocked policy/binding tests establish
source behavior only; they do not certify a packaged runtime, backend permissions,
OAuth exchange, task completion or deployment.

### Document read lifetime

GET and OPTIONS requests bind the caller signal to the current document lifetime.
Beforeunload aborts pending reads and blocks later reads before WebKit retires
the origin. Pagehide keeps that barrier for discarded/cached documents;
pageshow starts a fresh lifetime. If departure is cancelled, trusted foreground
activation permits new reads while the document remains visible. Synthetic
activation cannot reopen the scope. Each binding releases
its listeners after settlement. The caller signal is never aborted by this
policy, so a submitted mutation sharing it remains in flight. Other request
methods retain their existing cancellation and uncertain-outcome rules. The
installed HaveAPI client still owns serialization, XHR, cancellation and decoding;
this policy does not replace its transport or project the generated request.
See [native failure and verification](../work-log/2026-11-22-document-read-lifetime.md).

## Generated-backed domain boundaries

Generated declarations describe the saved API schema; they do not validate a live
response or grant permission. Domain guards require actual IDs for navigation or
mutation targets and preserve optional/null scalar fields and partial relations.
Malformed present fields fail with the original receipt. In particular, a missing
association does not establish a successful detach during uncertain-write recovery.

| Area | Supported boundary |
| --- | --- |
| Public status/content | Public statistics use the cluster namespace. Public outage handlers may omit user; admin scope changes separately require user.id. Public news requires localized message, while editing uses en_message/cs_message. |
| Correction tokens | Preview/Update and Location, OS-template and Language choices use public bindings even in an authenticated browser. The anonymous template list is server-scoped; omitted eligibility flags are not fabricated. Admin resolution uses authenticated bindings and actual eligibility for approval/create-VPS or a changed template. |
| Account/profile | User creation omits unsupported monthly_payment. Paid-until cannot be cleared with null; reminder clearing uses the observed lifecycle expiry. TOTP consumes recovery_code only. Session output has no current marker; label update may return an empty framed object. Mail contacts do not infer undeclared role/primary data. |
| Storage | Clone descendants are unconditional. Mount creation omits unsupported type/master fields; update keeps mountpoint/mode read-only. Current disk usage remains available without fabricated history. |
| Host addresses | Assign uses its path only and the actual parent-interface route. A fresh Show must confirm the reviewed parent before send; a missing/changed route blocks the action. VPS context in assignment history is not an allocation association. |
| Filters | User-data, traffic, environments and locations do not send unsupported text queries. OS-template admin list filters do not send q/enabled/supported. Stale links reset unsupported filters/cursors with the approved explanation; supported scope and pagination remain. |
| Help/mail | Unlocalized HelpBox filtering and clearing a localized language are unsupported. Missing mailbox handler counts remain unavailable; no nonexistent mail-transaction link is offered. |
| Operational history | StateLog accepts limit only. The drawer shows the earliest 50 chronological records with no offset/continuation claim. |

These are source-backed limits of the generated contract. Live capability fields
must also be validated before exposing an action; static input typing cannot be
bypassed because an OPTIONS response appears to allow an unsupported input.

## Pagination: known blockers

For the locked vpsAdmin source `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`
(HaveAPI 0.29.8, API 7.0), `/host_ip_addresses` with `order=asc` and
effective-admin `/ip_addresses` with `order=asc` return ascending IDs after
`from_id`. These two lists use a 250-row sequential traversal with at most 20
requests or 5,000 rows, 10 seconds per request and 30 seconds overall. Each next
request uses the last validated ID unchanged. The first page's count is useful
diagnostic metadata, not a transaction snapshot; a full final page at the
budget remains partial. A failed later page keeps earlier validated rows and
displays partial status. This source finding still needs a pinned live API check.

For non-admin `/ip_addresses`, the same `order=asc` groups by owner before ID.
It therefore uses one bounded response of at most 1,000 rows without an ID
continuation. `desc` and `interface` on the admin page sort loaded rows in the
browser. Host IP lookup uses the supported exact `addr` filter, and an ID outside
the suggestion sample is accepted for an eligibility-dependent DNS transfer
only after a targeted filtered API query returns that exact ID. The `q` filter
is unsupported on these host IP routes. Legacy `q` or cursor links reset with
an explanation; the sampled free-IP suggestions cannot prove availability.

This does not change the ordering contract of network interfaces, assignments,
accounting, datasets or other collections. Their separate correctness work
remains open.

The common UI uses `from_id`/visited cursor history, but that alone does not define
ordering. The next cursor must agree with each backend's ordering and inclusivity.
A minimum ID is unsafe when time-ordered data has nonmonotonic IDs; equal timestamps
need deterministic tie handling. An empty page, a short page, an explicit next
cursor and an API error are different outcomes.

| Area                   | Requirement                                                                   | Current tracked work                                               | Release constraint                                                      |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| VPS user-data          | Supported owner/format filters and honest search; stable multipage traversal. | Issue241, [PR496](https://github.com/Kerrycek/clankerdev/pull/496) | Pending; depends on backend work excluded by maintainer.                |
| IP assignment history  | Ordered cursor, tied times, owner scope, end/recovery.                        | Issue208, [PR507](https://github.com/Kerrycek/clankerdev/pull/507) | Pending; no lossless guarantee on current deployed contract.            |
| Dataset/snapshot lists | Match actual dataset/snapshot order and cursor.                               | Issue189, [PR509](https://github.com/Kerrycek/clankerdev/pull/509) | Pending; frontend-only assumptions cannot fix unsupported server order. |

A prior isolated user-data run recorded three pages (25/25/1), owner/format/search,
error/end and cleanup checks against UI `3ac1be67` / API `320af0e1`. It does not
certify the deployed main or IP/dataset/snapshot cases, and its database timestamps
were not an adversarial time-order fixture. Keep this evidence scoped.

Backend PR43 concerns user payments and was present in test API `486350466`; it
is not the user-data/IP fix. Backend PR44 was later rejected by the maintainer.
Do not merge dependent work or revive frontend PR242 based on earlier approval.
A new agreed contract must precede release of the dependent fixes.

Required cursor matrix: at least three pages; nonmonotonic IDs versus timestamps;
tied timestamps; filtered/owner-specific lists; foreign-owner denial; malformed
cursor and API errors; previous/next/back/reload; empty/final page; no duplication
or omission. Local fixture success is not enough to prove the server's ordering.

## VPS address availability

`GET /ip_addresses` accepts `usable_for=vps`, which includes networks with
purpose `vps` **and** `any`; `purpose=vps` is an exact filter. The compatible-use
contract was added upstream in `632786cba39c03394ccf00db54639b0e835773cd`
and is present in the dev API revision
`486350466e8fb6f966add1cde3fa2bc12b4d6b62`.

The `location` filter uses LocationNetwork membership, including secondary
locations. Non-admin requests also honor `userpick` and address visibility.
`network.primary_location` is descriptive metadata, not the list of allowed
locations. Do not apply a second primary-location/environment filter in the UI.
An export-only network is not compatible with VPS allocation.

With network availability support, assignment requests also send
`network_enabled=true` when `IpAddress.Index` metadata advertises that filter.
Cached detached addresses are revalidated with the same availability criteria.
Explicitly disabled addresses are excluded from assignment selectors but remain
visible in owned inventory, with assignment unavailable. Missing `enabled` is
unknown: older APIs receive no unsupported filter and no fabricated disabled
state. Capability lookup failures remain visible instead of broadening selection.

Free-IP suggestions apply the advertised network availability filter before the
50-row limit and reject explicitly disabled rows in stale responses. A successful
capability response from an older API omits the unsupported filter.

Each suggestion query has one 12-second budget covering shared capability
discovery and all of its address pages. Expiry settles that suggestion as an error
and allows later locations to load. It cannot start an address request after
late metadata or accept late address results. The shared capability request and
its five-minute cache remain available to other callers; a suggestion timeout
does not cancel or invalidate them. Capability failures are errors, not evidence
of an older API or an empty pool.

Location filtering can include networks associated with that location whose
primary location is elsewhere. The default sample groups by primary location,
so it follows strictly increasing ascending-ID cursors through up to 20 pages
of 50 until it has three eligible addresses for the requested type, or reaches
a terminal short page. Full foreign-location pages must not imply an empty
pool. Malformed/repeated cursors and the scan bound are errors, not empty
success. All pages share the original deadline; manual inventory filters and
VPS assignment eligibility remain separate from primary-location sampling.

Explicit retry starts a new suggestion budget. It reuses successful cached
metadata, retries a settled failed lookup, or joins an existing pending lookup.
Joining a stalled lookup is still bounded for that caller; retry does not force
a second shared OPTIONS request. The budget applies per query, not to the whole
page. Priority locations load first and later locations continue progressively.

An IP ownership-only PUT can complete synchronously with no action-state ID.
For an exact owner+environment update (or owner release), accept that form only
after a fresh exact-IP GET confirms both `user` and `charged_environment`.
Missing, mismatched or unreadable fields retain an uncertain outcome and block
replay. A present invalid asynchronous receipt is never reinterpreted as a
synchronous success. Other IP updates and route assign/free still require a
valid action-state receipt. Do not repair accounting inconsistencies in the UI.

The admin assignment shortcut opens a VPS-first dialog. Use the API's assign or
assign-with-host-address action with the selected interface, without a preceding
ownership PUT. The server owns accounting and location-association enforcement.
Failed preflight reads are retryable because no mutation was submitted.
Preflight reads reject stale owners/interfaces; final authorization stays in
the API. Durable local guards prevent duplicate/ambiguous follow-up submissions.

Administrator network create/edit checks the relevant action's `enabled` input
metadata before displaying or sending the availability control. An edit also
requires a known current boolean state. Omitted fields preserve server state;
false is sent explicitly when disabling. The dialog shows network identity and
existing assigned/owned counts. Disabled networks remain in ordinary lists.
A failed capability lookup shows the error and a retry action. Generated live
action descriptions are narrowed before enabling availability: missing fields
remain unsupported, while malformed containers or a present non-Boolean enabled
parameter raise a receipt-preserving ApiOutputError rather than appearing as an
older API. Cached capability
data cannot authorize availability writes while a lookup is pending, fetching
or errored. Other fields remain editable.

Administrator Network responses may include `available_to_users` and
`owned_unassigned`. The first counts registered allocations without an owner,
interface or operation reservation and is zero on disabled networks. The second
counts owned allocations without an interface, including reserved entries and
disabled networks. Each address or prefix counts once. These are inventory
totals; allocation still depends on location, purpose, quota and current
reservations. They are read-only and absent from non-admin responses.

The network list displays `used` as registered stock, `assigned` as interface
assignments (including VPS and exports), and the two new counts independently.
The editor displays total `owned`, including assigned entries. Older APIs may
omit the new counts; a dash represents unknown data without a derived fallback.
Admin IP flags warn only when the included network explicitly reports
`enabled=false`; true or missing state adds no warning or extra request.

These additions use the enforcing backend's network availability contract and
are separate from backend PR #44 and IP-history cursor work. API validation
remains the final authority for ownership, quota, network availability, concurrent
reservations and successful assignment. Admission accepted before disable may
finish afterward; existing assigned service continues.

## Dev deletion configuration limitation

Investigation recorded a missing default lifetime for VPS soft deletion in the dev
API environment. The frontend can expose supported modes and custom expiry, but
cannot decide the service's retention policy. Confirm whether the original delete
was accepted before retrying. The maintainer must choose the default policy before
an authorized shared configuration change; do not change a live VPS to test it.

## Backend proposal procedure

Capture sanitized reproduction, exact UI/API pins, current request/response,
expected supported behavior, owner/role boundary, ordering assumptions and tests.
Prepare a scoped proposal separately. Do not modify upstream repositories, shared
schemas or services without explicit matching authorization. Local references and
previous PR approval do not confer blanket permission.

## Concrete client contracts

The [action contracts](ACTION_CONTRACTS.md) specify request state transitions,
reason/placement rules, migration timing/IP serialization, deletion modes, resource
overrides and DNS validation. They are the reviewed frontend contract at the stated
revision; deployed backend permission/capacity remains authoritative. Contract
changes must identify the matching backend resource/action/version and have
adversarial tests, not just update an adapter type.

## API language and transaction labels

The WebUI sends `Accept-Language: cs` or `en` with HaveAPI calls, matching the
resolved UI preference (including system language). This overrides the API
user-language default without changing the user's mail language. The existing
API contract comes from locked vpsAdmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
Transaction `label` is translated by the API; `name` is a technical identifier.
Headings prefer nonblank `label`, then `name`, then the UI fallback. Technical
names remain available for diagnostics and operation classification.

Changing UI language cancels old query results and invalidates read caches;
active queries refresh and inactive queries refresh when next used. Editors
remain mounted and mutations are never replayed. A read retried after OAuth
renewal retains its original language. No local translation map duplicates the
API catalog. See [verification and limitations](../work-log/2026-10-06-transaction-api-labels.md).

## VPS initialization inputs

Both VPS create and reinstall accept either `vps_user_data` (saved resource ID)
or `user_data_format` plus `user_data_content` (inline), never both from these
forms. Disabled initialization omits all three fields. Blank inline content is
rejected locally; submitted nonblank bytes, including indentation and trailing
newlines, are preserved. This uses the existing API contract and does not change
the backend.

The saved picker queries `/vps_user_data` in descending ID pages of 50, continuing
with the minimum ID as `from_id`. Admin accounts send the selected VPS owner's
`user` filter, including their own ID in My view. Regular members omit `user`
because that input is blacklisted and the API scopes results to the authenticated
member. Query cache keys include owner and role; returned rows are additionally
restricted to that owner. It does not send the unsupported `q` filter. Changing
owner clears and invalidates the selected ID before submission.

## Admin node overview and maintenance (REQ-028)

The inventory keeps `/nodes` keyset pagination/state filters and enriches its rows
by ID from admin-only `/nodes/overview_list`. Both calls are existing contracts;
OverviewList has no cursor/filter parameters and returns active nodes. Inactive
index entries retain their own fields. Public status remains a limited fallback,
not the sole authority for authenticated metrics. Memory/ARC are MiB and uptime
is seconds. Only administrators request the overview; support uses its permitted
index and public status. A failed overview is visible without erasing the list.

Maintenance checks OPTIONS `/nodes/:id/set_maintenance?method=POST` and exact
`GET /nodes/:id` before confirmation and again before posting. Synchronous
`POST /nodes/:id/set_maintenance` sends `node.lock` plus optional `node.reason`.
No API change or synthetic task ID is needed. Unknown outcomes require exact
read-back before another write. `master_lock` belongs to a parent resource and
cannot be removed on the node. The frontend comparison detects stale state and
reason, but cannot provide an atomic compare-and-swap guarantee absent from API.
[Implementation, test scope and limitations](../work-log/2026-10-19-nodes-overview-maintenance.md).

## Synchronous admin-team VPS preference (REQ-023)

`PUT /vpses/:id` with exactly one boolean `vps.allow_admin_modifications` is
allowed to return success without an action-state ID. The backend's empty VPS
update chain saves this DB-only field immediately. A supplied receipt must still
be valid and is polled normally. Mixed payloads and other blocking operations
retain their mandatory receipt checks; the existing lifetime-only exception is
unchanged. The UI waits for a successful fresh read of the frozen VPS ID and
exact boolean before confirming. Its durable mutation lock remains held during
the read-back attempt; an unavailable/mismatching read retains the draft and
does not show success.
Malformed receipt/network ambiguity does not become synchronous success.

Maintenance-window edits use their separate `/maintenance_windows/:weekday`
endpoint and must never submit this preference. The targeted regression covers
Sunday 0, read-back, reload and independence in both directions. This is a
frontend contract correction, not a backend change or production replay.

## OAuth outbound and local navigation boundaries

Server-side code exchange, refresh and revocation reject provider redirects;
they retain bounded response bodies, deadlines and session serialization.
Browser authorization navigation remains supported. Shared local return paths
reject backslashes and control characters before basename handling; valid
local query/fragment state is retained. See the [review and regression proof](../work-log/2026-10-28-oauth-redirect-boundaries.md).

## Guarded advisory corrections (REQ-055)

The owning API's security-advisory documentation defines the mutation contract.
Generated operations carry content revision and state preconditions on parent,
CVE and node corrections, direct retraction and namespaced DELETE bodies.
Publication sends the required captured revision and retains its unchanged-revision
contract; it does not accept an expected-state input. Draft creation has no
existing revision, and its returned draft revision starts CVE reconciliation.

The advisory-specific preflight uses authenticated generated root descriptions
and concrete generated lifecycle action descriptions for record preparation and
permission checks. Draft synchronization requires all six CVE and nested
node-status Create/Update/Delete actions with revision and selected-state
parameters before its first write. It accepts conventional labeled choice maps using
machine keys, and supported string arrays. Missing, malformed or denied metadata and invalid revisions stop writes; public reading and the separate announcement
flow remain available. Root metadata never replaces server authorization or locks.

The advisory CVE API orders rows by `cve_id`, while `from_id` filters by
primary-key ID. The collector can omit CVEs across pages when these orders
differ; its fixture with increasing IDs does not establish multi-page completeness.
Aligning producer ordering and cursor semantics remains a separate follow-up,
with a regression using nonmonotonic IDs.

Upgrade the complete API before enabling these UI writes, and upgrade every
security-advisories sync consumer before resuming sync. Mixed API pools are not
supported. The old unguarded UI is not a safe write rollback target. Software
rollback does not undo corrections, retraction or deleted data; deletion recovery
requires an existing backup. The client dependency supplies these operations; the backend upgrade remains a
separate operation. No backend migration or transport change is introduced by
the WebUI migration.

## Generated user/settings contract limits

User/session output models validate real navigable identity; nullable scalar and
partial association facts retain their meaning. Compatibility user scanning keeps
its 1,200-row/12-batch budget and complete receipt; a compatibility-page count is
not a server snapshot and does not replace scan completeness. TOTP recovery uses
the generated recovery_code field. Session label updates may acknowledge with an
empty user_session object; fetched session views still require real identity.
The API does not identify a current session for the removed badge/count behavior.

Mail template outputs do not declare role membership. An empty template recipient
therefore displays the existing unavailable state without inferring a primary or
role destination, and without a copy target; explicit recipients and disabled
state remain available. A populated paid-until date cannot be cleared through
this API: local validation preserves the reviewed value/draft and sends no write.
Valid date and zero monthly-amount updates keep the exact account owner and review.
User creation does not accept monthly_payment; the separate account editor remains
the supported operation, without an extra post-create mutation. Reminder clearing
uses the observed expiration through the existing lifecycle payload helper; unknown
lifecycle fields disable edits.

Public correction preview/update and its Location, OS-template and Language choices
use generated public bindings even in an authenticated browser. Anonymous OS-template
lists are server-filtered to enabled/supported choices and omit those flags; the
client does not fabricate them. Administrative template eligibility uses explicit
true flags. A known unavailable selected template blocks only a required creation
or changed-template submission; load failures retain their load error and unchanged
correction/deny/ignore paths remain valid.

## Anonymous overview advisory preview

REQ-054: `fetchPublicSecurityAdvisories()` uses `publicHaveApiCall` via
`publicApiCall` for one GET `/security_advisories`, namespaced parameters
`security_advisory[limit]=5`, `[state]=published`, `[order]=newest`. It sends no
session credentials, even if the browser has a session. The helper validates an
array, filters exact published states, sorts by publication date/ID and caps at
five. This is a preview with an archive link, not a complete paginated result;
public archive behavior is unchanged. Failed previews have their own explicit
error state. No new backend endpoint or permission is required.

<a id="selected-incident-escalation-summaries"></a>

## Generic incident policies

Authenticated `IncidentPolicy` Index/Show discovers active policies directly
from the loaded registry. Keys are arbitrary runtime strings; localized labels,
optional plain-text descriptions and period metadata come from the API. A policy
with no matched incidents or stored override is still discoverable. Neither the
UI nor the generated client enumerates policy keys or identifies a source adapter.

`VPS::IncidentPolicy` Index/Show returns every configured policy for the authorized
VPS and owner epoch. Counts use saved creation-time memberships, never codename
matching in the client. Current limits use the VPS override first, then the global
override, then the declared limit. A valid configuration supplies current limits
and status even when applicability uses a hook or no incident matched. Invalid saved
override combinations set `configuration_valid=false` with null effective values;
this is a configuration error. Reads never invoke applicability, classify old
reports or create settings or evaluation rows. Saved evaluations describe past
decisions and do not replace current limits.

The VPS itself supplies batched `incident_warning_count` and
`incident_stop_threshold_count` values for compact list/overview warnings. They
count policies at a proven threshold, with stop precedence per policy; invalid
configurations are excluded. The UI makes no request per VPS row and derives no
counts from incident-history pages. Shared automatic-shutdown permission,
accounting boundary, confirmed-stop time, next-incident eligibility and outstanding
physical action or chain remain VPS-wide and appear once. Reaching a threshold does
not promise a future shutdown. Existing feedback about failed or uncertain
operations remains visible outside the policy details.

The VPS Incident policies tab uses `/vps/:id/incidents` in the current app/admin
mode and preserves the originating owner context. The separate Incident reports
tab opens the existing `/incidents?vps=ID` list with the same context. It requires
no new page or API. Each policy shows Period / Incidents / Limit / Action columns
for its warning and VPS-stop periods, using the supplied periods, current counts
and limits. Status and policy-filtered history remain visible. Policy details and
shared settings appear directly on the page.
The overview shows alerts linking to that tab only when warning or shutdown
thresholds are reached; near-limit and clear policies do not add overview panels. Policy labels and
historical labels are API data, not translations selected by key.

Each administrator limit input shows its current effective value and a separate
Inherited/Custom choice. An untouched inherited field sends null, including when
the other field changes. An explicit custom value remains custom even if it
equals the default. Clearing or resetting a field selects inheritance. When a
custom override exists, this API does not expose the value it would inherit.
Selecting inheritance therefore shows a pending value until a confirmed save
and authoritative readback supply it.

Admin `VPS::IncidentPolicy` Update targets the key in the path and accepts only
the two nullable limit overrides. Omitting a field preserves its override; explicit
null inherits the limit. Validation is atomic and audited. The nearby inheritance control clears only
that policy's local draft; Save is the explicit write. Shared shutdown permission
uses a separate isolated VPS Update without a policy key or limit fields. Both
forms retain target confirmation, preflight, durable uncertain-write protection
and exact authoritative readback before clearing drafts. Any failure after an
accepted write is verification uncertainty, including a denied or mismatched
readback. Unrelated asynchronous mutations retain their strict receipt checks.

Incident history uses an explicit `policy_key` distinct from source codename.
Matching source reports and owning notices qualify via saved membership/action
identity; multiple memberships do not duplicate rows or inflate pagination totals.
Retired policy keys remain queryable within authorized history.
The report list populates its policy select from one cached active-policy registry
query. A deep link to a retired policy retains the exact key as an option. A failed
registry query shows an unavailable state and preserves the filter. Selecting a
policy preserves the owner, VPS and other filters while resetting pagination.

`IncidentReport::PolicyEvaluation` Index under the already-authorized report
returns saved policy labels, time, counts, limits, effective mode and permission,
decision, state, nullable `matched` and warning/stop period values. Member policy
sections show only evaluations with explicit `matched=true` and state `recorded`
or `audit_only`. Administrators can also see false or null membership and error
states in separate diagnostics. An error can coexist with saved `matched=true`
membership; excluding it from member sections does not remove it from backend
counts. Missing membership data or capability establishes neither a match nor a
nonmatch. An empty member collection can hide private errors for matched policies,
so it shows neutral unavailable feedback. Only exhaustive saved evidence visible
to administrators can establish that no policies matched. Missing counts, limits and periods
are never filled from a current policy or another saved evaluation.

Report detail links active matched keys to the corresponding VPS policy anchor
and saved keys, including retired keys, to scoped policy-filtered history. These
links require an authorized included VPS association; a raw historical VPS ID is
insufficient. Detail sections share one active-policy discovery request. Report
lists make no request per row. A notice's nullable `notice_policy_key` and
`notice_policy_label` identify its originating saved action policy; ordinary
reports have null values. The UI never derives notice identity from the trigger's
first policy or its codename. Administrator diagnostics expose only safe error
stage and class, without raw context, hook source, exception messages or private
mail errors. Existing safe notice-trigger links and
mail and outcome distinctions remain separate.

These calls use generated resources and the existing shared request policy,
with capability detection against the backend. An older API makes the feature
unavailable; there is no single-policy compatibility transport or hardcoded
fallback. The registry SDK release prerequisite in
[the client contract](HAVEAPI_CLIENT.md#generated-vpsadmin-typescript-sdk) still
applies before WebUI merge. This replaces the unreleased selected-policy flat
summary contract; no production old-feature upgrade is claimed. The backend owns
membership, privacy, counting and action dispatch; React adds no enforcement timer,
rule editor, action endpoint or BFF route. See
[the revision record](../work-log/2026-11-17-generic-incident-policies.md) and
vpsAdmin's authoritative `docs/incident-escalation.md`.

### Administrator overview and recorded history

The administrator Incidents menu opens `/admin/incidents/overview`. Reports keeps
`/admin/incidents` and its existing filter links. History is at
`/admin/incidents/history`. Existing report creation, detail, member and per-VPS
routes retain their behavior. Each new view requires an authenticated
administrator and its authorized Index action, required fields and global metadata
in the API description. If those capabilities are absent, the view reports that
it is unavailable and keeps Reports reachable.

Overview uses generated `incident_policy_exposure.index`. Each row represents a
VPS and an active policy with saved matches counted in the current 30-day window.
All active policies are included by default, including VPSes that are stopped or
below the warning threshold. The server supplies ordinary VPS/User/Node Resource
references, counts, limits, remaining counts, modes, permissions, cooldown dates
and recorded outcomes. It filters and sorts the full result before pagination.
The frontend does not match reports, calculate counters, fetch each VPS separately
or sort a page in isolation. Owner inactivity, transfers and outstanding shared
actions are separate restrictions. Neither the remaining count nor the end of a
cooldown guarantees that a later report will trigger an action.

Overview keeps the supplied counts, limits, periods and remaining counts visible.
Secondary fields are available in Details without another request. Missing
restrictions remain unknown. A completed request alone does not confirm that the
VPS stopped; confirmation requires the explicit shutdown completion field.

History uses generated `incident_policy_evaluation.index`. Its default
`violations` scope includes reached thresholds or recorded actions; `matched`,
`all` and `outstanding` are also available. Retired policy keys and original report,
VPS and owner IDs remain searchable after their current associations disappear.
Missing values remain unknown. Saved matches, counts, limits and decisions retain
their recorded values. Action and email outcomes reflect the latest read and may
be newer than the selected evaluation period. A completed warning is not evidence
of a VPS shutdown. Email state `sent` means acceptance by the mail server, without
proof of inbox delivery; queued, suppressed, failed and uncertain states remain
separate. Rows with the same physical shutdown action ID refer to one shutdown.
History does not record every state change or retry.

History presents the saved decision and counts separately from the current action
and email outcome. A reached threshold with decision `none` does not establish why
no action was chosen. Error, skipped, audit-only and unmatched or unknown membership
states remain visible when they affect interpretation. Expanding entry details or
filters does not change the query, page membership or cutoff.

These endpoints use offset/limit pagination: 25 rows by default, at most 100.
They return deterministic server ordering and global `total_count`, `next_offset`,
`as_of` and `read_at` metadata. Filters and sort order stay in the URL; changing
them resets the offset and preserves the echoed cutoff. Refresh resets the offset
and obtains a new cutoff. The cutoff fixes the counting windows while settings,
ownership and action outcomes reflect the latest read. Concurrent changes can
therefore affect later pages. History defaults to the preceding 30 days, including
the period start and excluding its end. Explicit UTC ranges may span up to 366
days. The `outstanding` scope includes unresolved work of any age and disables
period controls. Pagination is local to these endpoints; the shared keyset
paginator is unchanged. Both views use the same backend read projection as PHP
and the daily summary. UI fixtures do not establish live API authorization or
policy-engine effects.

## Incident notice history

IncidentReport Index/Show add read-only nullable `notice_kind` (`warning`,
`stop_completed`), raw integer `trigger_incident_report_id` and `notice_mail_state`
(`pending`, `queued`, `sent`, `failed`, `uncertain`, `suppressed`). Ordinary reports
return null; older APIs omit the fields. Both leave the existing ordinary report
view intact. Warning decisions and confirmed-stop outcomes are displayed separately
from mail progress. `pending` is not yet queued; `queued` is not successful SMTP;
`sent` means SMTP success without proof of inbox delivery.

The server supplies a trigger ID only when it is safe for the original owner,
VPS and epoch. Missing/unsafe references remain absent; React never reconstructs
them from other fields or queries another owner's history. List and detail reuse
the same scoped presentation and authenticated incident route. Immutable subject/
text remains the explanation; no new action, second sender, administrator MailLog,
private delivery-error endpoint or private error detail is exposed.


VPS migration acceptance returns a tracked action state before completion. The
receipt uses the frozen submitted maintenance_window/finish_weekday/finish_minutes
values (maintenance defaults true; custom Sunday0/midnight0 are valid). Initial
preparation and data transfer can precede the backend window wait. Leaving the
page does not cancel the operation or release duplicate/uncertainty locks.


### Export dataset picker reads

The picker uses existing Dataset#index `limit=1000`, `_meta[count]` and
`_meta[includes]=user`. Only administrator My view sends its own `user` filter;
non-administrator ownership remains enforced by the API. The UI rejects foreign
or missing-owner rows when ownership is required. Unknown/mismatched counts do
not imply a complete collection. Do not use a numeric-ID cursor to claim complete
traversal of Dataset#index's name order (REQ-044 remains a backend dependency).
Explicit `#ID` keeps the existing authorized Dataset#show path; ordinary numeric
names require an offered choice. No new API parameter, transport or mutation is
introduced. Snapshot reads and both Create source payloads retain their existing
contract. Authoritative ownership and the fresh administrator My-view check
remain immediately before Create.

Snapshot picker reads keep `limit=100` and request existing `_meta[count]`.
Loading, failed and verified-empty responses remain distinct; read-only retry
repeats the same authorized request. Unknown/partial counts disclose the bound
and link to the existing scoped snapshot route, whose row shortcut preserves the
exact selected snapshot outside the first100. Query keys include the selected
dataset, so a late prior-dataset response cannot replace current choices. This
does not introduce a cursor, change Create or bypass server source permissions.


### NFS documentation and container rootfs

Contextual exports(5) help explains existing rw/ro, sync/async, subtree_check and
root_squash server semantics. It does not change API values/defaults or make
all_vps/enabled/threads Linux options. No new API calls, permissions or payloads.

The rootfs note uses reviewed vpsAdminOS8e44a512 architecture, pinned by the
inspected API22adc source: osctld passes the host runtime rootfs into LXC config;
the existing NixOS snippet mounts additional guest NFS storage. This is source
contract evidence, not a new boot/mount or node-version certification. Snapshot
exports retain temporary command-only instructions. [Scope and primary sources](../work-log/2026-11-15-export-nfs-help.md).

## Verified export collision receipt

Approved EXP-05 eee13eb8f00dd658 / REQ-048. Actual isolated dev API22adc8b5
created disabled export3 for new member66/dataset89 on local NAS node104, with
physical chain480 done1/1, then rejected the repeated captured payload with
HTTP200, statusfalse, responsenull, errors{} and `dataset <full_name> is already
exported`. The API chain source uses the analogous snapshot reason. Match only
a non-ambiguous Create error for POST /exports and the captured source type;
403/404, other actions, transport/protocol failures and other reasons stay distinct.
This is a presentation change, with no API adapter/payload/permission/lock change.
Actual deployed cff desktopChromium/mobileWebKit both showed the raw English
reason inside the dialog; no visibility regression was invented. Real fixture
cleanup and final candidate/release qualification remain separately required.



## DNS configuration counters and server reports

Approved DNS-06/07/08/13 / REQ-049, inspected API22adc8b54d464e0f899550746b69181930da80fd.
`DnsZone.serial` is a stored unsigned configuration counter (schema default1),
incremented by record operations. Zone creation does not query an external
primary to populate it. `Supervisor::Node::DnsStatus` independently updates
`DnsServerZone.serial`, load/refresh/expiration and `last_check_at` from node
reports. Those timestamps and serials are observations, not proof of current
availability or complete DNS publication. Zero is a valid serial; no numeric
ordering or equality is used to infer readiness.

`Supervisor::Node::DnsTransferLog` maintains the latest transfer event by its
event time. A previous failure can coexist with a later loaded-zone report;
show the event result/time separately. Keep known reason-code translations and
unrecognized diagnostics without manufacturing a failure from absent evidence.
Nonadministrator reads of internally sourced zones mask transfer-event fields;
no new privileged read or readiness endpoint is introduced. Existing owner and
hidden-server restrictions remain authoritative.

The secondary report keeps its existing first100 server-zone read. The Servers
tab retains its own50-row keyset pagination and administrator-only mutation
callbacks. Query keys, filters, limits, Create/Delete payloads, task tracking,
preflight and local locks remain unchanged. Presentation does not incorporate
the separate PR219 API/SDK readiness proposal or require API activation.
