# Workflow catalog and behavior to preserve

This catalog covers all product domains in the current route/API inventory. It is
not a claim of exhaustive field-level legacy parity. Each workflow inherits the
role/scope, localization, focus, draft/error and uncertain-write rules from
[product design](PRODUCT_DESIGN.md) and [architecture](ARCHITECTURE.md).

Source links identify implementation for inspection, not a substitute for test
results. Every endpoint field remains governed by [API contracts](API_CONTRACTS.md).
The [generated inventory](IMPLEMENTATION_INVENTORY.md) covers exact route variants,
layouts, aliases and imported finance/advisory gates.

For detailed actions, role/state restrictions and validation examples use
[ACTION_CONTRACTS.md](ACTION_CONTRACTS.md). For test coverage and remaining proof
use [EVIDENCE_MATRIX.md](EVIDENCE_MATRIX.md).

## Public entry and authentication

**Intent:** inspect service availability, sign in, recover access or correct a
registration without exposing private information. Public overview combines
cluster/node status with outages/news/advisories; external heatmaps are optional.
OAuth login/callback/logout preserve a safe return destination and display errors.
The public desktop header and mobile menu offer sign-in without a separate
password-reset shortcut (maintainer decision, 2026-09-30). Password recovery
remains available through sign-in and the login-required/expired-session screen
using the configured provider flow. Token-scoped registration
correction exposes only the request allowed by that token.

**Failure contract:** public API failure is not “all healthy”; unavailable heatmaps
must not break node lists. Auth callback errors offer a way back. Expiry redirects
preserve safe navigation context and do not loop. Check session JSON separately
from SPA fallback. The production frontend requires valid BFF configuration and
session JSON before mounting. Missing, redirected, malformed, oversized or
stalled responses show an early bilingual error with a retry; no stored
standalone token is restored. An anonymous BFF result clears old standalone
and impersonation credentials. Retry repeats only the two bootstrap GETs, not
an API mutation. [Routes](../../src/routes/router.tsx),
[public adapter](../../src/lib/api/public.ts), [BFF docs](../../bff/README.md).

## VPS creation, detail and power

**Intent:** choose placement/template/resources, create a VPS, inspect identity and
runtime status, and manage it. Creation defaults are suggestions; async updates
cannot overwrite entered resources. Member scope stays owned; admins can explicitly
use the appropriate wider view. Header distribution/runtime facts and equal-width
cards make common diagnostics available without a second screen.

After an accepted create response, open the exact VPS detail immediately while
provisioning continues. A localized banner distinguishes accepted/pending work,
confirmed completion, task failure and unavailable status; it links to Tasks
without opening the Tasks panel over the detail automatically. Fetch the detail
while work runs and refresh it on completion. If the API cannot yet serialize
the new VPS, retain its accepted ID and progress instead of showing only a
spinner. Creation locks still block conflicting mutations, including after reload.
The administrator's originating member filter stays in the detail URL. Missing
receipts or transport loss remain uncertain and must not trigger a blind retry.

**Actions:** start, graceful shutdown, immediate poweroff, restart and supported
power/lifecycle operations must name the target and honor live state/transaction
locks. Shutdown and poweroff use the same stop request with distinct force values.
Creation and power requests may
be asynchronous. Preserve action-state links and reconcile uncertain submissions
before a second attempt. [VPS adapter](../../src/lib/api/vps.ts),
[power failure fixture](../../e2e/specs/app/vps_power_failures.spec.ts).

Accepted VPS migration shows one persistent shared toast at the bottom right
(on mobile, across the bottom), naming the submitted VPS and linking to Tasks.
It confirms acceptance, not completion, and stays visible while the detail refreshes
or the user scrolls. The draft stays in place and confirmation clears after
acceptance. Rejection and missing action-state receipts retain their errors and
uncertainty safeguards; they never display an accepted toast.

Migration retains maintenance-window, immediate and custom weekday/hour timing,
cleanup, no-start, skip-start, mail and reason options. No-start, skip-start and
reason are visible directly in the migration form. IP transfer appears for environment changes and IP
replacement for location changes; both default off as in the legacy UI.
The single-VPS API does not support the migration-plan `stop_on_error` option.
See the [parity audit](../work-log/2026-10-03-migration-feedback.md).

## Compute, disk, access, network and maintenance

**Intent:** edit compute and root disk in a coherent workspace, configure hostname,
access, features, interfaces and supported maintenance actions. Compute and dataset
changes have separate backend boundaries: do not promise an atomic combined save.
Admin allocation overrides are explicit and never silently enabled for members.

**Failure contract:** retain reviewed values and identify which operation failed.
Refresh affected facts after known acceptance, but do not reset unrelated input.
Role/state restrictions remain on direct routes. Root usage/quota checks and server
validation determine allowed shrinking/growing; the UI does not manufacture free
resources. [Access](../../src/lib/api/vpsAccess.ts),
[features](../../src/lib/api/vpsFeatures.ts), [mounts](../../src/lib/api/vpsMounts.ts),
[maintenance](../../src/lib/api/vpsMaintenance.ts),
[resource fixture](../../e2e/specs/app/vps_resource_workspace.spec.ts).

## Console and VPS deletion

**Intent:** entering Console opens a session directly; intentional replacement and
revocation remain explicit. Opening a page must not spawn an uncontrolled retry
loop after a failed token request. Secure console URLs are required.

Console pages use a compact VPS identity and session toolbar, without the full
VPS overview or help block above the terminal. The default fits the complete
terminal and keyboard into the available window. Original size restores unscaled
content when readability matters; it deliberately allows scrolling. The current
cross-origin renderer has fixed minimum geometry and no resize protocol, so the
WebUI scales a stable document rather than resizing its terminal or recreating a
session. The fit is verified against the pinned renderer, not arbitrary future
router markup. See [viewport evidence and limitations](../work-log/2026-09-30-console-viewport.md).

Deletion separates standard member removal from admin soft/hard options and
optional custom retention. Review target and mode; show a durable accepted-request
receipt and Tasks link. An accepted request may still fail later. Hard mode cannot
accidentally inherit a soft expiry. Dev's missing default retention remains a
backend configuration decision. [Console fixture](../../e2e/specs/app/vps_console_page.spec.ts),
[PR518](https://github.com/Kerrycek/clankerdev/pull/518).

## Storage, NAS, snapshots, backup and export

**Intent:** inspect datasets and usage/quota, create NAS storage, manage snapshots,
schedules/plans and downloads, export datasets and restore from available backups.
VPS root disks remain in VPS detail; member NAS and Backup Center retain separate
navigation. Backup filters remain stable across tab changes.

**Restore contract:** identify source snapshot/pool and destination; distinguish
local from replicated/remote restore. Track transfer/restore chains to an actual
outcome before calling the data recovered. Live evidence needs synthetic content
and cleanup, not only a completed UI task. Download/export URLs and permissions
must not leak to unrelated owners. Snapshot/list pagination retains the documented
backend blocker. [Datasets](../../src/lib/api/datasets.ts),
[exports](../../src/lib/api/exports.ts), [backup fixture](../../e2e/specs/app/backup_center.spec.ts).

## DNS and networking

**Intent:** create/edit zones and records, configure transfers, servers, TSIG and
DNSSEC, inspect logs, and manage relevant IP/interface/resolver resources.
Administrators also have network/address inventories and allocation operations.

**Success contract:** UI save and DNS publication are separate evidence. Real
publication tests query the actual isolated DNS service after the transaction.
Respect supported record types, TTL and payload fields; preserve zone context on
errors. Secret-bearing keys must be scrubbed from diagnostics. IP assignment
history must not lose entries due to a false cursor assumption.
[DNS](../../src/lib/api/dns.ts), [transfers](../../src/lib/api/dnsTransfers.ts),
[interfaces](../../src/lib/api/networkInterfaces.ts), [IP history](../../src/lib/api/ipAddresses.ts).

### Private IPv4 assignment, including staging

From VPS detail → Network → Add IP address, select the interface and address
family, then choose a route. The candidate request uses the VPS node's location,
`assigned_to_interface=false`, and `usable_for=vps`: general-purpose (`any`)
networks are valid for VPS use too. The API's LocationNetwork associations are
authoritative; a network's primary location/environment cannot exclude a target
that is available through another association. The same rule applies when
starting from a detached address in the member networking overview.

Cached/preselected addresses outside the first candidate page are queried again
with location, network, address, prefix, compatible purpose and assignment filters.
They are not injected into the selector merely because they were previously
visible. Errors stay visible and disable submission; a failed availability request
is not evidence that the pool is empty. The API still checks ownership, quota,
locks and assignability when executing the existing assignment action. Candidate
availability is not a reservation or a guarantee of quota. The selector continues
to offer a bounded first page, not a claim to enumerate the entire pool.

## Account profile and user administration

**Intent:** members manage profile, mail/security preferences, keys, sessions, MFA,
metrics, user-data and namespaces. Administrators inspect/update users, resource
usage/packages, environment configuration, finances and account states as allowed.
Effective timezone is explicit. User login/timezone/filesystem-related legacy
controls must not disappear during layout simplification.

**Personal scope (maintainer decision, 2026-09-30):** Account from the header
always means the authenticated account, in both member and administrator layouts.
Admin privileges do not turn these pages into global lists. Sessions and metrics
pass the current user to the API for administrators; non-administrators use the
API's enforced owner restriction (metrics rejects an explicit user input for
those roles). Session exact-ID lookup must match that same owner. Namespace/map
deep links verify ownership before mounting their detail, entry queries or actions.
The separate `/admin/users/:id` dossier continues to target its selected user.

**Scope audit:** profile/security, resource usage, SSH keys, MFA/known devices and
mail preferences already pass the authenticated ID through user-scoped paths or
panels. Namespace/map lists already fix the current owner. User-data passes the
admin owner filter; its separate backend filtering/pagination limitation remains
REQ-042 and is not certified fixed by this change. This is a source/fixture audit,
not a claim of live API authorization certification.

**Risk contract:** distinguish security-sensitive changes from ordinary preferences;
confirm disabling MFA/deleting keys/sessions, preserve failures, never log secrets.
Passkey setup belongs to the authentication origin. Profile edits may create a
review request rather than directly change the account; the receipt/status must
explain that. [Users](../../src/lib/api/users.ts),
[user accounts](../../src/lib/api/userAccounts.ts), [namespaces](../../src/lib/api/userNamespaces.ts),
[user-data](../../src/lib/api/vpsUserData.ts).

The [detailed account contracts](ACTION_CONTRACTS.md#account-and-user-administration)
cover lifecycle dates, environment inheritance, mail recipient precedence and
impersonation. A view switch preserves the operator identity; impersonation does not.

## Applications, profile changes and review queues

**Intent:** inspect a request's applicant data, technical metadata and risk checks,
then approve, reject with a response, close without response or request correction
where the API state permits. A queue can start from the selected item; moving to
the next item is controlled by the compact preference. Resolved registrations can
be reconsidered through supported transitions, not an arbitrary status picker.

Registration and profile-change review use the same vertical arrangement: a
full-width details card with initially open technical metadata, followed by a
full-width decision card. The change card compares current and requested values;
registration risk checks remain inside applicant details. The compact queue
preference stays above the action buttons and appears only for awaiting requests
opened in a review queue. Returning through browser history refetches the current
request state; an old history entry must not revive queue controls for a resolved
request. Reconsidering such a request returns to the list. Queue IDs are a snapshot
of the visible list, so the detail does not present their length as a live count of
waiting applications. Advancing still checks each candidate's current state and
skips requests that no longer await a decision.

Resolve and preflight errors stay inside the open review dialog and are announced
as alerts to assistive technology. They do not depend on background toasts, which
remain hidden while a modal is open. The draft and Cancel action remain available.

**Registration response presets (prepared):** the individual review dialog offers
four complete rejection reasons (nonexistent address, incorrectly filled application,
duplicate application, existing membership) and three correction requests (incomplete
address, unverifiable address, missing/incomplete name). The unverifiable-address
message asks the applicant to check/correct their address and optionally send a map
link with their house marked. Generic incorrect-application rejection needs no added
detail. Every preset is editable, and an administrator can write an entirely custom
reason. The final review shows exactly the reason submitted to the existing resolve
API; no extra email request is made by the client.

Preset bodies use the registration's language (Czech/English), independently of the
administrator's interface locale. Resource-only language references are resolved
through the language catalog, never assumed from numeric IDs. If language cannot be
resolved, the administrator explicitly chooses a message language before using a
preset; free text remains available. Changing the correction form's language updates
an untouched preset. Edited/custom text is never automatically translated or
replaced. Account-change and bulk-review reasons retain their existing free-text
behavior. [Presets](../../src/pages/app/admin/RegistrationReasonPresets.ts),
[fixture coverage](../../e2e/specs/admin/registration_reason_presets.spec.ts).

**Failure contract:** preserve the current decision draft, stale/missing owner
errors, and uncertain-operation guard. Already-created accounts/terminal states
must not be duplicated. Test persisted backend state and notification/action-state
outcome with synthetic accounts before claiming full lifecycle certification.
[Request model](../../src/pages/app/admin/RequestDetailModel.ts),
[resolution mutation](../../src/pages/app/admin/RequestResolveMutation.ts),
[requests API](../../src/lib/api/requests.ts).

## Payments and finance

**Intent:** members inspect their payments; admins assign/review incoming payments,
manage account-related finance, history and forecasts. The Finance menu opens
incoming payments as the common working destination. Global finance and sensitive
user payment views have explicit administrator gates even if a support-level user
can access other admin pages.

Payment instructions preserve inline base64 PNG QR images and external HTTPS
QR image URLs supplied by the API. The NixOS deployment must allow the reviewed
external generator through `security.imageSources`; HTML sanitization alone does
not grant permission under CSP. Prefer the exact generator path (see
[NixOS service](NIXOS_SERVICE.md)). Amount and reference query parameters remain
as supplied by the API; the frontend does not recalculate them. Unchanged
instructions retain their decoded image DOM nodes during scrolling and session
activity refreshes. Only changed sanitized content (including translated text)
replaces the instructions; the generator-provided QR quiet zone is preserved.

For inline images, the exception is limited to image sources in this sanitized
payment HTML, with a PNG signature, valid base64 and a 1 MiB URL limit; links, news HTML, SVG and other
data MIME types retain their existing restrictions. Browser checks verify image
decoding and painted pixels for both currencies, not just an empty visible box.

**Failure contract:** amounts/currency/timezone/scope must stay bound to the reviewed
transaction. Failed assignment remains in review; queue advances only on the known
appropriate outcome. Partial/bulk outcomes require reconciliation rather than
blind retry. [Finance](../../src/lib/api/finance.ts),
[payments](../../src/lib/api/payments.ts), [gated routes](../../src/routes/adminFinanceRoutes.tsx).

## Tasks, transactions, monitoring, incidents and OOM

**Intent:** inspect asynchronous action states/chains/items, monitoring events,
incident reports and memory-exhaustion reports/rules/tasks/stats. These explain
why an object is busy and whether an operation succeeded.

API operation labels/names are the primary visible titles in transaction lists,
details and Tasks. Do not replace localized or unfamiliar names with “Operation”,
a client-side action guess or an English-only rewrite. Classification still
provides category/severity metadata and fallbacks for missing/blank API names.
When the API name is already the heading, do not repeat it as “Backend name”.
Explicit local labels for an action the user just submitted remain available
before its API state arrives. [Naming regression and evidence](../work-log/2026-10-03-transaction-operation-names.md).

**Contract:** action state, transaction and object state are related but not
interchangeable. Unknown/stale locks must be shown as such. Users see permitted
objects; session filters and pagination must retain context. Large cgroup/SSH/task
identifiers must wrap or scroll appropriately on mobile. Monitoring decisions and
incident creation keep failed submissions retryable where safe.

Incident lists fit the available desktop content width without horizontal table
scrolling. Subjects, codenames, hostnames and IPv6 addresses wrap without losing
text; narrower screens use the existing cards. The administrator-only owner and
reporter columns remain available in admin view. See the
[layout change record](../work-log/2026-10-03-incident-list-width.md).

[Transactions](../../src/lib/api/transactions.ts),
[monitoring](../../src/lib/api/monitoring.ts), [incidents](../../src/lib/api/incidents.ts),
[OOM](../../src/lib/api/oom.ts).

## Nodes, cluster and migrations

**Intent:** inspect node status, kernel/system history and configured versions;
admins manage node/cluster/network/resource settings and migration plans.
Heatmap availability follows legacy config/type/maintenance rules. Expose useful
member visibility without granting infrastructure writes.

**Per-VPS migration (REQ-028):** show a compact destination selector. Clicking it
opens a height-bounded, scrollable list of active hypervisors with hostname, location
and environment, plus a text filter for those labels. Selecting a destination closes
the list; the selected name and metadata stay visible. Support keyboard selection,
Escape cancellation and retained selection when searching. This supersedes the
initial always-visible radio-card layout after the maintainer highlighted clusters
with dozens of nodes. The source node is excluded. Read all ID-cursor pages rather than silently
truncating the inventory; an inventory error blocks submission and offers retry.
The API still decides compatibility and available capacity, so a listed destination
is not a promise that migration will be accepted.

Timing and the optional owner-facing reason sit together. IP options appear when
the destination scope makes them applicable, following the legacy location/environment
rules. Cleanup, email, startup and error options stay visible. There is no advanced
options disclosure or repeated four-tile summary. Confirmation names the VPS and
destination and resets when any submitted value changes. A successful request is
queued/tracked, not proof of completed migration; errors preserve the form.
This replaces the hostname-only lookup and hidden reason requested by the maintainer
on 2026-09-28. See the [change record](../work-log/2026-09-28-vps-migration-ux.md)
for verification and release status.

**Failure contract:** edits/actions bind target, state and permission; mutations
return tracked results and retain errors. A node route being present is not proof
that every action is allowed for support/member roles. History cursors and status
sampling intervals need their real API semantics.
[Nodes](../../src/lib/api/nodes.ts), [history](../../src/lib/api/nodeHistory.ts),
[cluster](../../src/lib/api/cluster.ts), [migrations](../../src/lib/api/migrations.ts).

## Security advisories, audit, mail and content

**Intent:** members/public read applicable advisories; admins manage advisories,
updates, relations and associated outages/rebuilds. Audit history supports
operational investigation. Mail administration covers templates/translations,
mailboxes/handlers, recipients and delivery logs. Content includes news and
contextual help boxes. Whole-template and standalone-recipient deletion are
intentionally blocked pending safe backend relation handling; translations and
template-recipient membership have separate supported delete operations. See
[the deletion boundary](ACTION_CONTRACTS.md#deliberately-blocked-mail-deletion).

**Failure contract:** privileged routes/actions remain independently gated; template
HTML preview must retain sandbox/remote-load defenses. Handler reorder partial
outcomes require reconciliation. Keep row/form errors where the edit happened.
Publication/email side effects require the actual requested scope, not incidental
permission to prepare documentation.
[Advisories](../../src/lib/api/securityAdvisories.ts), [audit](../../src/lib/api/audit.ts),
[mailer](../../src/lib/api/mailer.ts), [help boxes](../../src/lib/api/helpBoxes.ts).

## KB integration and documentation

**Intent:** maintain real navigation/page bindings, selected articles and usable
cs/en screenshots for the new UI, without replacing old evidence prematurely.
The separate KB repository pins UI and API independently, starts its owned test
cluster and uses real login/navigation on synthetic data. Fixture screenshots are
valuable layout proof but not KB live-capture proof.

**Contract:** semantic IDs/fingerprints follow changed routes/labels; screenshots
exclude real people, tokens and recovery material. Record receipts and avoid
repeating completed mutations. Production KB publication and transition strategy
remain separate approval/ownership decisions. [KB repository](https://github.com/vpsfreecz/vpsfree-kb-contracts),
[verification gates](VERIFICATION.md).

## Global search

The header and command palette search independently of visited list pages
(REQ-070). Administrator mode calls `cluster/search`; My view uses scoped VPS
and DNS queries and exact IPv4/IPv6 address queries. A normal member relies on
API authorization; an administrator's My view additionally checks the current
owner. Switching to administrator mode is explicit, never an automatic fallback
when a personal search has no match.

The IP `user` filter means direct address ownership, not ownership of the VPS
assigned to that address. Exact-address searches omit it and verify both returned
ownership paths; unknown and foreign owners are excluded. Admin ID-ascending
pages are traversed before presentation limits. Member owner-first ordering does
not support that same cursor guarantee: a full 100-row exact-address page reports
an incomplete lookup rather than pretending it exhausted the results. A prefix
can narrow the query. Partial IP substring/containing-network search in My view
is not provided by the exact `addr` API contract.

My-view DNS searches scan all supported descending-ID pages and cache the
complete scoped catalog for 30 seconds. Failed scans are not cached. Healthy
matching categories remain usable when another category fails; if there are no
matches and a relevant category failed, show an error, not “No results”. This
is not a claim that partial successful results are exhaustive. Administrative
header results retain all navigable deduplicated hits returned by the server in
a bounded scrolling list, with keyboard selection scrolled into view.

Source inspection and synthetic browser regressions cover these contracts.
They do not establish the cause of a specific production user's intermittent
result without that user's mode/request trace, nor certify a live API release.

### Deferred overlay focus

When a modal or drawer opens, its delayed initial-focus callback preserves any
focus already placed inside the active overlay. It must not move a selected link
back to Close before keyboard activation. Focus still enters a newly opened
overlay from outside, wraps on Tab, and respects the topmost nested dialog.
