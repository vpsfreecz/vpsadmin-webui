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
| UI settings | Generated Index filters by namespace/key and Set writes the JSON-string value at `/webui_user_settings/{namespace}/{key}`. Only the canonical configured resource path (optional trailing slashes) is supported; invalid paths fail before binding/dispatch. Namespace/key are encoded once by the SDK. | [adapter](../../src/lib/api/webuiUserSettings.ts); collection PUT + POST fallback caused the persistence bug fixed by PR519. |
| Session JSON | Same-origin JSON with accessToken, sessionKey, sessionExpiresAt; anonymous values null; no secrets in executable config. | [server](../../bff/server.js), [auth](../../src/app/auth.tsx); retain origin/security checks. |
| New OAuth session identity | The authorization-code exchange sends one validated callback `req.ip` in `Client-IP` and exact `User-Agent: vpsadmin-webui`; invalid IP fails before provider contact. Refresh and revocation use that User-Agent without Client-IP. | [BFF contract](../../bff/README.md), [server](../../bff/server.js); this describes new session metadata, not retroactive changes or browser authorization identity. |
| Resource overrides | Explicit admin override only where backend action supports it. | PR503; do not infer that every create/edit endpoint accepts one universal flag. |
| Custom soft deletion | Admin lifecycle PUT for the supported future lifetime transition; member uses normal DELETE. | PR518; do not send invented expiry parameters to DELETE or use a delete-then-edit race. |
| Hard deletion | Explicit privileged mode; disregard a leftover soft-expiry draft. | PR518; validate actual backend permission and receipt. |
| Console entry | Acquire/reuse console token through existing API; bounded request on entry. | PR517; do not create unbounded replacement sessions during polling. |
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

| Collection | Supported filter boundary | Source / regression entry point |
| --- | --- | --- |
| Exports | Owner (`user`); no global text, dataset, snapshot, host or state filter in this adapter. Detail-by-ID is a separate request. | [adapter](../../src/lib/api/exports.ts), [fixture contract](../../e2e/specs/app/exports_filter_contract.spec.ts) |
| Networks | `location`, `purpose` and optional exact `enabled` when supported by the API. The current list search exposes location/purpose only. Do not forward text, IP-version, role or managed-state filters merely because those attributes exist on a network. | [adapter](../../src/lib/api/networks.ts), [adapter tests](../../src/lib/api/networks.test.ts), [URL/filter fixture](../../e2e/specs/admin/cluster_networks_filter_contract.spec.ts) |
| Migration plans | `state` and `user`; no free-text query. This does not limit the separate destination-node picker for a VPS migration. | [adapter](../../src/lib/api/migrations.ts), [fixture contract](../../e2e/specs/admin/migration_plans_filter_contract.spec.ts) |
| Transaction items | `transaction_chain`, `node`, `type`, `success`, `done`; no item-name/text search. Transaction **chains** have a different contract which does accept `name`, as well as state, object and user/session filters. | [both adapters](../../src/lib/api/transactions.ts), [item-filter fixture](../../e2e/specs/app/transaction_items_filter_accessibility.spec.ts) |
| User namespaces / maps | No text or label search. Namespaces support `size`; maps support `user_namespace`. Owner filtering, and namespace `block_count`, are exposed only in admin scope with admin fields enabled and no fixed owner. Removing an invalid/disallowed URL filter resets cursor/page. | [scope/URL rules](../../src/components/userNamespaces/userNamespaceFilterSemantics.ts), [fixture contract](../../e2e/specs/app/user_namespace_filter_contract.spec.ts) |
| Resource packages | Adapter filters are `environment` and `user`, not package-label text. Assignment history uses the existing `UserClusterResourcePackage.created_at` output, not the definition timestamp or `updated_at`; no new request or API mutation is needed. Global/personal/all scope normalization is handled by the list model. | [adapter](../../src/lib/api/clusterResourcePackages.ts), [model](../../src/pages/app/admin/cluster/ResourcePackagesListModel.ts), [model tests](../../src/pages/app/admin/cluster/ResourcePackagesListModel.test.ts) |

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
root/action descriptions. [SDK bindings](../../src/lib/api/sdk.ts) supply
separate public/authenticated clients at the configured, already-versioned API
base, including any mount prefix. The [request policy](../../src/lib/api/apiRequestPolicy.ts)
receives the complete `RequestSpec` and returns the complete `RequestResult`.
Output namespace, headers, signal and timeout survive this boundary. The installed
HaveAPI runtime owns XHR, query/body encoding, JSON parsing and envelope validation;
WebUI does not decode a second envelope or guess an SDK output namespace.

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

Every vpsAdmin operation now uses the generated SDK. The historical generic
wrapper and single-namespace projection are removed. Domain view types derive
from generated outputs, retaining nullable/absent fields and partial associations;
each workflow validates the identity and fields it actually needs. Existing
[actual-package fixtures](../../src/lib/api/haveapiRequestClient.test.ts) feed
serialized replies through controlled XHR. Mocked policy/binding tests establish
source behavior only; they do not certify a packaged runtime, backend permissions,
OAuth exchange, task completion or deployment.

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

| Area | Requirement | Current tracked work | Release constraint |
| --- | --- | --- | --- |
| VPS user-data | Supported owner/format filters and honest search; stable multipage traversal. | Issue241, [PR496](https://github.com/Kerrycek/clankerdev/pull/496) | Pending; depends on backend work excluded by maintainer. |
| IP assignment history | Ordered cursor, tied times, owner scope, end/recovery. | Issue208, [PR507](https://github.com/Kerrycek/clankerdev/pull/507) | Pending; no lossless guarantee on current deployed contract. |
| Dataset/snapshot lists | Match actual dataset/snapshot order and cursor. | Issue189, [PR509](https://github.com/Kerrycek/clankerdev/pull/509) | Pending; frontend-only assumptions cannot fix unsupported server order. |

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
The handwritten adapters send content revision and state preconditions on parent,
CVE and node corrections, direct retraction and namespaced DELETE bodies.
Publication sends the required captured revision and retains its unchanged-revision
contract; it does not accept an expected-state input. Draft creation has no
existing revision, and its returned draft revision starts CVE reconciliation.

The advisory-specific preflight reads the authenticated versioned root OPTIONS
graph once per attempted workflow, plus existing-record lifecycle OPTIONS for
record preparation/permission. It accepts conventional labeled choice maps using
machine keys, and supported string arrays. Missing, malformed or denied metadata and invalid revisions stop writes; public reading and the separate announcement
flow remain available. Root metadata never replaces server authorization or locks.

Upgrade the complete API before enabling these UI writes, and upgrade every
security-advisories sync consumer before resuming sync. Mixed API pools are not
supported. The old unguarded UI is not a safe write rollback target. Software
rollback does not undo corrections, retraction or deleted data; deletion recovery
requires an existing backup. No backend migration, dependency or transport change
is part of this UI package.

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
