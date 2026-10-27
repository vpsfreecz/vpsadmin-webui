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

## Application identity and credits

The sidebar footer and mobile drawer link to `/about` and to the loaded bundle's
Git commit. Public pages provide the same footer without requiring login.
The commit comes from the same build metadata as `build-info.json`, embedded at
build time so an old open tab cannot claim a newer deployed revision. Unknown
revisions have no commit link; local modifications are indicated by an asterisk
and explained on About. The page lists Jakub Skokan, Pavel Šnajdr and Michal
Janoušek with years (2012–2026, 2008–2014 and 2026 respectively), without
individual roles, contribution estimates, a
general thank-you paragraph or AI-tool commentary. This follows the maintainer’s
2026-10-16 clarification and the concise legacy About style. It also links
to the source repository under “Zdrojové kódy” / “Source code”, without license
commentary or the package-metadata link. This change does not grant or
change a license or carry over the legacy PHP template credits (REQ-072).

## Status navigation while signed in

A separated block above About in the desktop sidebar and mobile drawer contains
Outages and Security advisories (REQ-054/055). These are direct links, without
an extra menu. In My view, including privileged accounts, both open the existing
public read-only pages. In administrator view, Outages opens `/admin/outages`,
where admins can use the existing create/review flow and support remains
read-only. Security advisories opens management only for admin; support opens
the public advisory list. The advisory link is no longer duplicated in Operations.
Desktop links stay below the scrolling primary navigation; mobile taps close the
drawer after navigation. Public pages retain the existing return-to-app link.
No route, backend permission, publication behavior or API endpoint changes.

## Public entry and authentication

**Intent:** inspect service availability, sign in, recover access or correct a
registration without exposing private information. Public overview combines
cluster/node status with outages/news/advisories; external heatmaps are optional.
The authenticated dashboard's Cluster status widget offers the same icon-only
heatmap action in desktop rows and mobile node cards, in both member and admin
views (REQ-025/026). It reuses the public heatmap configuration, node eligibility
and dialog; external frames load only after an explicit click/tap. Missing or
failed configuration hides the optional action/column without blocking status
information. Compact dashboard density still limits the visible node list.
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

**News management shortcut (REQ-053):** the authenticated dashboard keeps
“All news” as a reading link to `/news`. Administrators in admin view also get
a small “Manage news” action beside it, linking directly to `/admin/content/news`.
It remains available when the widget is collapsed or empty. Members, support,
and administrators in My view do not see it. Existing server permissions and
editor behavior remain authoritative; the shortcut performs no write.
The menu and destination heading are called “News and help” (“Novinky a nápovědy”).
Cluster no longer repeats a content-shortcuts card; its operational shortcuts
remain available in a full-width card. Existing news/help-box URLs remain stable.

**News layout (REQ-054):** public `/news` uses one compact chronological list.
On desktop the publication time sits beside the complete message; on narrow
screens it sits above it. Short announcements do not get separate card headers
or visible internal IDs. Preserve existing ordering, localized/sanitized HTML,
links, full long messages, missing-date fallback and loading/error/empty states.

## VPS creation, detail and power

**Intent:** choose placement/template/resources, create a VPS, inspect identity and
runtime status, and manage it. Creation defaults are suggestions; async updates
cannot overwrite entered resources. Member scope stays owned; admins can explicitly
use the appropriate wider view. Header distribution/runtime facts and equal-width
cards make common diagnostics available without a second screen. The selected
distribution is a labeled metadata field after the administrator-visible owner,
followed by node and location; members see the same distribution field. Unknown
templates retain the unavailable marker instead of guessing a distribution.

The overview resource card shows allocated CPU in a single full-width tile,
followed by memory and disk usage bars. CPU utilization, uptime and load stay
in the VPS header instead of being repeated in this card. No replacement
metric is added merely to fill the former second tile. Swap appears between
memory and disk only when allocated capacity is positive, using the same
usage-bar presentation. A zero or missing swap allocation does not occupy a
summary tile or usage row.

Creation shows `VPS` as a placeholder, so typing a custom hostname needs no
manual deletion. Clearing the field or entering only
whitespace also resolves to `VPS` in review, the API payload and outcome tracking.
Custom hostnames are trimmed and validated as before.

Creation and reinstall share optional first-boot initialization: leave it disabled,
paste a script/cloud-init/NixOS configuration, or select saved User data. Saved
choices belong to the VPS owner; changing the owner clears the selected template.
The picker has explicit loading, failure/retry and empty states and loads further
ID-cursor pages on demand. It links to the owner's User data management in another
tab so the current form draft remains available. Reinstall still requires explicit
destructive confirmation and preserves the choice after a rejected request.

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

The shared administrator lifecycle editor follows the HaveAPI datetime contract:
`expiration_date` may be null, while `remind_after_date` must be a datetime when
present. Reactivating an expired VPS with no reminder omits that field. Changing
expiration preserves a nonempty reminder explicitly, because setting expiration
also resets the reminder. Clearing only a reminder reapplies the existing
expiration without a reminder; clearing expiration sends only its nullable field.
State transitions keep asynchronous action tracking and the existing power-action
confirmation/transaction locks. See the
[renewal regression evidence](../work-log/2026-10-18-vps-expiration-reactivation.md).

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

The VPS overview network card displays every address returned by the VPS address
query, in API order, with its prefix, scope badge and copy action. It does not
collapse addresses behind a “more” count. Long IPv6 values wrap on narrow screens;
copying retains the complete address and prefix. The existing shared address
query and its 250-record limit are unchanged by this presentation change.

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

### Admin-team VPS configuration preference (REQ-023)

Maintenance exposes the legacy `allow_admin_modifications` preference alongside
the weekly schedule. These are independent controls: the preference authorizes
base-system configuration changes, while maintenance windows govern timing.
The description retains the legacy distinction between base-system files and
member applications/data, and the email notice. Radio choices show the current
API boolean; a missing value leaves both unselected and disables writes.
Nothing is changed simply by opening the page or selecting a choice.

A deliberate Save sends only `vps.allow_admin_modifications` to the existing VPS
update action. Owner/member and administrator scope, state gates, fresh busy
preflight and durable uncertainty handling remain. The request freezes its VPS
ID and choice before asynchronous lock acquisition. The returned action receipt
is tracked in Tasks; accepted is not completed. Success requires both a successful
finished action and a new successful VPS read with the requested boolean.
Rejection retains the draft; a missing receipt locks retry until reconciliation.
Support's administrative view is read-only. No API or default-consent change is
part of this workflow.

### Maintenance weekdays (REQ-023)

The existing maintenance-window endpoint addresses a day by its `weekday`, not
its resource `id`. It uses Ruby weekday numbering: Sunday 0, Monday 1 through
Saturday 6. The UI displays Monday through Sunday but submits Sunday to
`PUT /vpses/:id/maintenance_windows/0`; it never sends weekday 7. Opening,
closing, time edits, per-day retry reconciliation and Allow anytime share this
mapping. Closing a day omits times and leaves server validation authoritative,
including the minimum weekly window. An API rejection preserves the draft;
success requires a refreshed server baseline. No API changes are required.

## Console and VPS deletion

**Intent:** entering Console opens a session directly; intentional replacement and
revocation remain explicit. Opening a page must not spawn an uncontrolled retry
loop after a failed token request. Secure console URLs are required.

Console pages use a compact VPS identity and session toolbar, without the full
VPS overview or help block above the terminal. A second wrapping row exposes
start, graceful shutdown/restart, root password and rescue mode. Power/password
reuse the detail header's confirmation, preflight, locking and task handling;
force shutdown/reset remain explicit options inside power confirmation. Rescue
is also available to owners, matching the API Boot authorization, only for
vpsAdminOS nodes. Its dialog offers an enabled compatible template, optional
original-root mount (default /mnt/vps), validation, and target/impact confirmation.
Rejected requests preserve the dialog and inputs; accepted requests track the
receipt through Tasks. Opening/cancelling these dialogs must not recreate the
console iframe or token. Session toolbar/fallback no longer offers a new tab.
The default fits the complete
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

Export detail presents its summary, allowed hosts and mount instructions as
full-width sections in that order. Hosts remain a compact table on desktop;
narrow screens use labeled rows with reachable edit/delete actions. The mount
command, fstab entry, systemd mount unit and NixOS configuration are stacked
vertically at every width, with a compact Copy button beside each example
heading, including the mount command. Long
code lines may scroll inside their block without widening the page. Temporary
snapshot exports continue to show only their temporary mount instructions.

**Snapshot export shortcut:** snapshot rows/cards in Backup Center and dataset,
VPS storage and NAS views offer NFS export beside Download. Each snapshot ID
appears once beneath its creation date/time, never repeated beside the actions. An existing export
opens its detail; otherwise a centered creation dialog starts with the exact
dataset and snapshot selected. A snapshot outside the picker's first 100 results
remains selectable. Opening/cancelling the dialog sends no mutation; explicit
creation sends the snapshot ID rather than a live-dataset source. Ownership,
lifecycle and pending-operation gates apply to creation. Existing export links
remain available for inspection. This reuses the existing API contract.

**Snapshot deletion:** VPS snapshots do not offer Delete, matching legacy UI.
NAS deletion requires positive primary-pool membership and no backup-pool copy
of that exact dataset. Dataset#index is queried with `dataset=<id>`, `to_depth=0`
and each role, so descendants/other datasets cannot prove eligibility. Missing,
loading, failed or incorrectly scoped evidence hides Delete; a failed read offers
Retry. The same controls serve Backup Center and NAS/dataset detail on mobile
and desktop; URL naming alone does not grant eligibility. Existing snapshot
mount/export references hide Delete too. Restore, download and NFS export retain
their existing gates.

After explicit confirmation, preflight checks transaction locks and repeats the
storage queries before sending the existing exact dataset/snapshot DELETE.
Confirmation binds the dataset ID and prevents simultaneous repeated submission.
The API remains authoritative: its reference counts are not fully exposed to the
frontend. A backup/dependency rejection stays in the dialog as a localized reason
without the exception class name. Known dependency rejection hides that snapshot's
Delete action in the current workspace; backup rejection refreshes availability.
The original error object remains unchanged for diagnostics. This changes no
retention policy and never deletes backup copies to make the request succeed.

**Export owner navigation:** global administrators have a visible Export owner
lookup next to the export-ID input. Numeric owner IDs filter directly; login
suggestions resolve to exact owner IDs. Numeric export-ID input offers separate
Open export and Show owner's exports choices, retaining the existing direct-ID
Enter behavior. The member detail header links to `/admin/exports?user=<id>`.
Owner changes reset the pagination cursor; reload and browser history restore
the URL filter, and clearing it restores the global list. List loading/errors
leave the filters mounted so typing an owner ID retains focus. Support and My
view do not expose arbitrary-owner controls or the member export shortcut.
These are navigation changes using the existing Export::Index `user` filter;
no backend filter or permission changes are involved.

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

### VPS DNS server shortcut

VPS detail → More → DNS servers is the first daily shortcut in both member
and administrator views. It opens the existing Configuration page with
`section=dns`, expands Additional VPS configuration and scrolls/focuses the DNS
resolver section. Selecting the shortcut again reopens a manually collapsed
section. Administrator member context (`user`) stays attached to the URL.
This configures the VPS resolver, not authoritative zones or DNS publication.

The focused section includes Reset and Save beside the existing resolver selector.
Both reuse the configuration form's draft and common confirmation: opening the
shortcut makes no write, other unsaved changes survive, and Save reviews every
changed field before submitting. Reset retains its existing whole-form behavior.
The existing `dns_resolver` update, action-state tracking, role/state/lock gates,
validation and API enforcement remain authoritative; read-only support can locate
the section without gaining write access. A browser fixture confirms navigation
and payload behavior, not live resolver deployment inside a VPS.

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

### Address and interface facts (REQ-050)

The member address overview requests the IP allocation and interface
explicitly when expanding active assignment records. Some API versions still
return unresolved allocation references from assignment history: the resource
omits the eager include preparation used by normal lists. For these records the
UI reads the current IP list once per affected, already scoped VPS, with at most
four concurrent requests. It never queries a VPS outside the loaded member VPS
scope, never promotes the assignment actor to allocation owner, and drops stale
assignment IDs absent from the current scoped allocation page. Each list retains
the existing 250-record limit; this is not a claim of complete large inventories. An assignment's user is
not the allocation owner: an address can be attached to your VPS without being
owned by you. “Owned” means the allocation's `user.id` matches the signed-in
member; explicit `null` means No, while omitted/redacted ownership remains unknown.
Interface names may come from an expanded `name` or a resource `label`; unknown
names retain a known interface ID rather than inventing a name. Detached and
routed addresses without a direct interface keep a dash. MAC addresses come from
`NetworkInterface.mac` in both the VPS desktop table and mobile cards, with a dash
when unavailable. These display changes do not perform configuration writes.

### Network availability

Administrators edit availability in Cluster → Networks (REQ-071). The list keeps
disabled networks visible and shows an unknown state when an older API omits the
field. The editor shows network identity and existing assigned/owned counts. The
availability control appears only when the relevant action advertises `enabled`;
an edit also needs a known current value. Disabling sends explicit false and
re-enabling sends true. Rejected updates retain the draft and display the error.

Disabling prevents new allocations and assignments, including detached owned
addresses. Existing service continues, and operations accepted before disable
may finish. Member inventory retains disabled owned addresses with assignment
unavailable (REQ-050). Assignment selectors request `network_enabled=true` only
when supported and revalidate cached addresses with the same criteria. Capability
or candidate errors stay visible. Older APIs receive neither unsupported fields
nor a fabricated disabled state. Backend enforcement remains authoritative.

The default free-IP sample requests IPv6 /64 blocks using the existing API
`prefix` filter. This keeps old host allocations from filling the bounded first
response ahead of useful blocks. The sample also validates returned IPv6 prefixes.
It is a /64 suggestion policy, not a deletion, a complete inventory, or a new
backend allocation rule. Explicit address, owner, VPS, network and prefix filters
and direct detail URLs retain existing /128 and other prefixes, including larger
blocks. IPv4 sampling is unchanged. The suggestion cache key includes the prefix.

IP rows and mobile cards expose four icon-only links in a single compact row:
Incidents, Assignment history, Edit, and Remove from VPS (Assign to VPS for an
unassigned address). Incidents and history retain the exact IP filter. Edit
opens the complete address detail with ownership and host addresses; the last
link goes directly to its routing section and retains the existing confirmation
before removal. Navigation never mutates an address. The controls use 20px icons,
compact desktop buttons and at least 44px touch targets. Localized tooltips and
accessible names identify each action without visible text beside the icons.
The desktop action column reserves only the width needed for those four controls.

Free-IP suggestions have a 12-second budget per query, including capability
discovery. A timed-out query shows the existing error or partial-results state
and allows later locations to load. Retry gives failed queries a fresh budget;
it preserves shared metadata for other callers. A still-pending shared lookup
may be joined again and time out again. Manual filters continue to use their
separate address list, so late suggestion results cannot replace that list.

The network list shows registered stock, interface assignments, owned unassigned
allocations and stock available to users. Count descriptions distinguish
registered inventory from eligibility for a particular VPS. Missing additive
statistics show a dash. The editor retains a separate owned total, including assignments.
Admin IP desktop and mobile flags add a Network disabled warning only for an
explicit false state. Existing rows, service links and actions remain visible.

## Account profile and user administration

Administrator member editing uses a named Role select instead of a numeric
privilege input. Choices match the legacy UI: User, Power User, Admin,
Super Admin and Master Admin. An existing nonstandard level remains selectable
as its current exact value; editing other fields must not silently change it.
No role is chosen automatically if the API omitted the level. API authorization
continues to decide whether a requested privilege change is allowed.

The account and member-detail tabs label MFA as “Two-step verification”
(“Dvoufázové ověření”). The page explains authenticator-app codes and passkeys;
TOTP stays in the authenticator section title for technical discoverability.
The wording does not change authentication, recovery or administrator permissions.

**Intent:** members manage profile, mail/security preferences, keys, sessions, MFA,
metrics, user-data and namespaces. Administrators inspect/update users, resource
usage/packages, environment configuration, finances and account states as allowed.
Effective timezone is explicit. User login/timezone/filesystem-related legacy
controls must not disappear during layout simplification.

**Administrator password shortcut (2026-10-22):** Member overview offers
Change password immediately before Edit user in the Details header. Only a
signed-in global administrator in administrator mode sees it, matching the API
permission to replace another member's password without their current password.
The centered dialog names the selected login and provides password/repeat fields,
Generate password and Copy. Generation uses Web Crypto and the existing unbiased
character selection/shuffle for 10 characters including all four groups: upper
case, lower case, digits and symbols. No weak random fallback is permitted.

Require password reset and Log out other sessions start checked. Generating a
password checks the former again. Save sends one owner-bound user update with
`new_password`, `password_reset` and `logout_sessions`. It requires matching
passwords of at least eight characters. Cancel/open/success clear the draft;
failures preserve it and show a generic error without reflecting backend secrets.
A pending request disables changes and duplicate submission. Navigation to another
member mounts a fresh action component, and an outstanding request retains its
original target. Header security status refreshes after success. Passwords stay
out of persistent state, mutation variables/results and diagnostic messages;
copying writes to the clipboard only on an explicit action.

**Member contact summary (2026-10-22):** Global administrators see Account
management and System administrator mail-role contacts beneath the address in
member details. Explicit role recipients use prominent amber rows and a Custom
contact badge; empty/missing role recipients fall back to the member's primary
email, shown neutrally. A missing primary and override are reported explicitly.
The summary uses stable role IDs (`account`, `admin`) and the existing mail model,
not localized API labels. It describes role defaults; per-template recipient
precedence still applies. Disabled mail delivery is identified separately.

The read-only summary shares the selected user's mail-role query/cache with the
Email tab and links to that user's existing settings. Failed reads show a retry
instead of claiming primary-email fallback; changing members cannot retain another
member's contacts. Support retains the address but does not query these privileged
contacts. Personal/My-view account pages have no administrator summary.

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
impersonation. In the member lifecycle form, switching to soft_delete replaces
the previous expiry with a one-calendar-month suggestion from now (month ends
clamped). The administrator can override it; Save and confirmation remain
required, and an already soft-deleted account keeps its saved date when opened. A view switch preserves the operator identity; impersonation does not.

### Bulk member package removal (REQ-076)

In the administrator member's Packages tab, select visible removable assignments
individually or with Select visible packages. The loaded list is still bounded
at 500 rows; this is not an all-pages/all-members selection. Personal base
packages and unknown package types are not selectable. The confirmation names
the selected member, exact assignment IDs, package labels and environments and
warns that resource limits are removed. It does not delete shared definitions.

Only global administrators see the bulk controls. The reviewed target snapshot
is frozen before submission; user/owner changes clear the visible selection and
do not redirect the in-flight requests. The existing synchronous assignment
DELETE endpoint is called sequentially. The batch is not atomic: known successes
stay removed, explicit per-item rejection remains selected, and 401/403 or an
ambiguous transport/server outcome stops the remaining writes. A running request
cannot be dismissed by Escape before React commits its pending state; the
synchronous in-flight guard also prevents duplicate submission.

After the batch, assignment and resource-usage caches are refreshed and individual
outcomes remain visible. Unknown outcomes are never blindly replayed. A separate
Refresh list and clear selection action reads the current member's list, clears
the old selection and allows a new, explicitly confirmed visible selection; it
does not turn an unknown delete into a claimed success. A failed refresh keeps
the block and error. Existing backend deletion/permission rules remain authoritative.

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

In the administrator's member overview, the source number in each recent payment
is a direct link to its incoming-payment detail, matching the member Payments
history. Manual credits without an incoming source do not get a fabricated link.
The overview retains its administrator-only finance gate. Browser Back returns
to the member overview; the detail's own Back link retains its finance destination.

Payment instructions offer individual copy icons for recognized bank-account,
IBAN, BIC, variable-symbol, message and amount rows, alongside the existing
whole-instructions copy. Account/IBAN whitespace is removed; variable-symbol
leading zeroes and the message are retained. Amount copy strips currency and
period, removes grouping spaces and normalizes a decimal comma to a point.
Unknown rows and ambiguous amount formats have no individual copy action.
Copy success/failure is announced and shown on the icon; keyboard activation and
single-tap touch activation use the shared clipboard helper. The same renderer
serves member instructions and administrator member-payment instructions.

The known invoice-help paragraph selects `podpora@vpsfree.cz` in Czech UI and
`support@vpsfree.org` in English UI. Czech bank-message guidance uses informal
address while retaining inline `/VS/<member ID>` formatting. Matching the known
bank-message sentences tolerates HTML line breaks, tabs and non-breaking spaces;
the visible text and whole-instructions clipboard text use the same conversion.
The Czech explanation omits the redundant bank-dependent wording sentence.
Both message-row “more info” links focus and scroll to the explanation and
highlight it subtly for three seconds. Repeated activation restarts that interval;
reduced-motion preferences disable smooth scrolling and the color transition.
The renderer restores only recognized help targets, keeps IDs instance-local,
and preserves QR image nodes and external links. Bank details and QR
payloads remain supplied by the API. See the
[payment-copy change record](../work-log/2026-10-16-payment-field-copy.md)
for review/deployment status, screenshots and verification limitations.

Payment instructions preserve inline base64 PNG QR images and external HTTPS
QR image URLs supplied by the API. The NixOS deployment must allow the reviewed
external generator through `security.imageSources`; HTML sanitization alone does
not grant permission under CSP. Prefer the exact generator path (see
[NixOS service](NIXOS_SERVICE.md)). Amount and reference query parameters remain
as supplied by the API; the frontend does not recalculate them. Unchanged
instructions retain their decoded image DOM nodes during scrolling and session
activity refreshes. Changed sanitized content (including translated text)
updates the rendered instructions; the generator-provided QR quiet zone is preserved.

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

Transaction history uses compact aligned ID/time/owner/object/action/state
columns on desktop and folds metadata under the action on small screens. The
owner column appears only in administrator mode; a normal member and an admin's
My view do not repeat their own identity in every row. This is presentation only:
server scope, owner/session filters and authorization are unchanged. Pinned chains
use the warning/orange row tint and a pinned marker; failed chains retain the
red tint even when pinned. Transaction tables use opaque semantic alert
backgrounds for these warm tints, including hover, instead of the blue-theme
general row blends; other tables retain their palette. The pin control exposes its pressed state and toggles
back to Unpin. Completed unpinned chains remain neutral. ID
links open chain detail; named object filter pivots, direct object links and
pinning retain their semantics. Chain detail presents one summary followed by
chronologically ordered steps, with local text/state filters and inline readable
input/output expansion. Copy preserves the original payload. A partial loaded
step set is labelled explicitly. The individual-transactions list uses the same
compact ID/step/node/VPS/state/duration layout and responsive column contract,
with creation time and chain navigation beneath the operation. Its chevron opens
the shared readable step details, including start/finish times, user/type/priority,
dependencies and exact payload copying. Node/type/chain/VPS filter pivots remain
available, with technical filters in the expanded row. Successful items stay
neutral; failure rows stay red. The item list retains its server pagination,
filters, route normalization and polling. Successful history stays neutral while active/error work
remains highlighted. Tasks retains its workflow with the same visual priorities.

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

Transaction item detail displays input and output vertically at full width.
The input has a large, bounded reading area; JSON fields are separated and string
values retain real line breaks, so embedded email bodies can be read normally.
Long tokens wrap inside the panel. HTML is always text, never rendered content.
Copy retains the original payload and the raw transaction JSON remains available.
Plain text, malformed JSON and unsafe numeric JSON fall back to verbatim text.
Inline transaction previews retain their existing compact layout.

The VPS list marks a VPS with a failed or fatal transaction chain only when the
chain was created within the last 7 days (REQ-074). Failed chains stay failed
until an administrator resolves them, so an older failure would otherwise flag
a working VPS indefinitely. The badge links to the chain detail; its tooltip
gives the operation and creation time.

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

Creating an incident from a VPS-filtered list prefills the explicit VPS and loads
its owner, node and active IP assignments. Other list filters are not report
contents: subject, text, codename and automatic action remain fresh defaults.
Back, Cancel and the list breadcrumb preserve the originating list query; direct
VPS-to-create links return to that VPS's incident list. Changing the target VPS
clears its selected IP assignment. Successful creation still opens the target VPS.
Return URLs are restricted to the incident list in the current application mode.
See the [context regression record](../work-log/2026-10-08-incident-create-context.md).

[Transactions](../../src/lib/api/transactions.ts),
[monitoring](../../src/lib/api/monitoring.ts), [incidents](../../src/lib/api/incidents.ts),
[OOM](../../src/lib/api/oom.ts).

## Nodes, cluster and migrations

**Intent:** inspect node status, kernel/system history and configured versions;
admins manage node/cluster/network/resource settings and migration plans.
The Nodes section is available only in administrator view, with existing
admin/support capability boundaries. My view has no Nodes navigation entry;
`/app/nodes`, `/app/nodes/:nodeId` and `/app/nodes/:nodeId/history` show access
denied without mounting the node pages or fetching their data, even for an
administrator in My view. Ordinary members cannot bypass this through `/admin`.
This supersedes earlier member node-list and kernel/system-history access at the
maintainer's request on 2026-10-14. Public/dashboard cluster status remains
available; heatmaps there follow legacy config/type/maintenance rules. API
permissions are unchanged and remain the authorization boundary.

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

The admin advisory list uses padded cells and aligned column headings, including
the first advisory column and the final action column. Numeric counts remain
right-aligned. On narrow screens the table scrolls inside its card so all columns
and the Open action stay reachable without widening the page.

News creation and editing show Czech and English text together, independently of
UI language. English is required by the existing API; an empty Czech translation
falls back to English for readers. Editing loads explicit translation fields,
never treats the localized read-only `message` as English, and keeps both drafts
on a save failure. Clearing Czech deliberately removes that translation. The
admin list previews the selected UI language and searches both loaded translations.
See [the bilingual editor record](../work-log/2026-10-14-bilingual-news-editor.md).

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
when a personal search has no match. After an admin/support account completes a
My-view search with no matches, the header and command palette show a compact,
neutral scope hint with an explicit switch button. It stays hidden during typing,
debounce/loading, errors and successful results, including owned VPS hostnames.
Normal members, administrator mode, empty inputs, incomplete palette qualifiers
and search-help mode have no administrative reminder. The
button uses the existing view-switch destination mapping and warning; no cluster
search runs before the user switches. The command palette retains the query and searches it in the newly selected
view; the inline header keeps its normal navigation reset. Keyboard focus can move from the header input into this action
without a delayed blur closing it.

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

### Centered form and filter presentation

REQ-010: user-data create/edit/deploy, export/host editing, member editing,
namespace-map creation and all advanced filters open centered dialogs. Template
actions remain reachable in a non-scrolling footer, including with reduced
viewport height. Ordinary mobile navigation and the Tasks/history side panels
retain their distinct purpose. Validation, submissions, URL-backed filters and
uncertain-outcome locks are unchanged. [Verification and limits](../work-log/2026-10-17-centered-form-dialogs.md).

### Deferred overlay focus

When a modal or drawer opens, its delayed initial-focus callback preserves any
focus already placed inside the active overlay. It must not move a selected link
back to Close before keyboard activation. Focus still enters a newly opened
overlay from outside, wraps on Tab, and respects the topmost nested dialog.

## Pagination during pending navigation

REQ-046: keyset page actions must issue their navigation even if the destination
matches the router params from the last committed render. A previous navigation
may still be pending. In particular, Next followed by Previous or page 1 must
cancel the pending page-2 destination rather than only changing local state.
Automatic URL normalization still avoids redundant writes. Filter parameters,
visited forward cursors and browser Back/Forward remain preserved.

## Admin node inventory (REQ-026/028)

Nodes shows ID/location/status, VPS slots, uptime, three load averages, idle/I/O
wait, free memory, ARC size/hit ratio, vpsAdmin and kernel versions. It uses the
existing authenticated overview so non-public infrastructure is visible too.
Summary counts are scoped to the current page. The administrator can open node
details, filtered VPS, copy the hostname, open configured heatmaps, or enable and
disable maintenance directly. These row actions have visible labels in this
inventory, with 16 px icons and compact 28 px desktop buttons. Maintenance and
VPS share a row; touch targets retain the shared 44 px minimum. Other heatmap
surfaces keep the icon-only action.

Maintenance opens a centered target-specific dialog with an optional reason.
Inherited locks explain which parent must be managed instead. Permission, busy
state, fresh lock/reason and duplicate-submission checks precede submission.
Definitive rejection keeps the dialog; ambiguous success/failure is reconciled by
exact read-back and remains blocked if unverifiable. Support has no maintenance
control and ordinary member mode has no Nodes route.
[Review evidence](../work-log/2026-10-19-nodes-overview-maintenance.md).
