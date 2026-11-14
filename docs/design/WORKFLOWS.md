# Workflow catalog and behavior to preserve

The signed-in dashboard opens its widget editor from a single control beside the page title (REQ-009).
The signed-in shell opens appearance, language, Account and logout from the nickname. Administrators with scope access also see view choices. Search uses the full row and the command palette keyboard shortcuts remain available (REQ-004, REQ-010).

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
Outages and Security advisories (REQ-054/055), without an extra menu. In My view,
including privileged accounts, both are read-only pages inside the normal
AppShell: `/app/outages` and `/app/security-advisories`, with matching detail URLs.
List/detail/back links, dashboard cards and advisory-to-outage links retain the
shell and its current scope. Desktop keeps navigation; mobile taps close the
drawer while its opener and the normal account/task controls remain available.
Reload and browser Back retain this context. The anonymous-only outage footer
sign-in hint is hidden for authenticated readers in both languages.

Administrator view keeps `/admin/outages` management, read-only for support,
and admin-only advisory management. Support uses the same published advisory
reader under `/admin/status/security-advisories`, with related outages under
`/admin/status/outages`; it never receives advisory editor privileges. These
readers are also available to administrators without changing their normal
management destinations. Status navigation stays highlighted on related readers.

An authenticated visit to a shared `/outages[/id]` or
`/security-advisories[/id]` URL replaces that location with the corresponding
`/app/` reader, preserving query and fragment and respecting the router basename.
Anonymous visitors retain the public layout and all public list/detail links;
no login is required for public information. About, registration correction,
public news and the expired-session notice keep their existing routing.
API access, publication filtering and backend permissions are unchanged.

## Concise interface copy

The account overview, VPS activity, dataset space, DNS zones, backup shortcuts,
transaction chains and Finance overview use their headings and controls without
the repeated descriptions approved for removal. Navigation and the OAuth shell
show the vpsAdmin name without a version tagline (REQ-004/009).

## Public entry and authentication

After expiry, the public overview keeps the current theme and language and
offers sign-in in the notice. The login return target retains the prior
protected page pathname. Transient query state, fragments and pending form
actions are left behind. The notice is per-tab and expires after five minutes.
Expiry cancels pending account-settings reads through the existing generated SDK
signal, ignores late responses and prevents queued preference saves while an
authenticated React closure is stale. An absent server record leaves device
preferences intact without writing them automatically; subsequent user edits
still save. The expiry fixture waits for actual authentication/settings loading
before ending the session, and schedules the expiry event outside its evaluation
so intentional full navigation cannot destroy the test's return context.
The zero anonymous-settings-read and zero-write assertions remain strict.
See the [regression record](../work-log/2026-11-08-settings-expiry-cancellation.md).

**Intent:** inspect service availability, sign in, recover access or correct a
registration without exposing private information. Public overview combines
cluster/node status with outages/news/advisories; external heatmaps are optional.
Public overview order is active/planned (and unclassified) outages, news,
published security advisories, detailed node status, member/VPS statistics,
then resolved outages. The statistics show member and VPS totals without IPv4
pool availability (REQ-054). Empty outage sections and the nominal-status banner are
omitted; pending/error states remain explicit. Current and planned outages may
coexist at the top, up to three per category; the resolved preview shows three.
The advisory preview makes one credential-free public GET with limit 5,
state=published and order=newest, defensively excludes all other states and
caps/sorts the result. Names and localized plain-text summaries link to the
public detail/archive. It makes no CVE or private affected-object requests.
The separate complete advisory archive and authenticated dashboard are unchanged.
Link valid CVE identifiers to vulnerability records and leave malformed identifiers as plain labels. (REQ-009).
Format advisory dates with the interface language, using a 24-hour clock in Czech and retaining the existing time zone. (REQ-009).
Separate account impact and missing personal impact from node mitigation. (REQ-009).
Overview, outage and advisory list pages retain an accessible screen-reader-only
h1 and omit the duplicated visible page heading/intro. Detail headings remain.
Equal-width member/VPS metric cards fill the available space. Their value font size and baseline match;
node availability retains the percentage/counts without a circular gauge.
Overview card headers/bodies and statistic cards use equal 12px padding. Repeated
subtitles are omitted; real status/error content, counts and loading states stay.
Status badges remain intentionally compact with wider horizontal than vertical
insets. Heatmap dialogs explain left-to-right CPU user/system/idle and disk I/O,
time flowing down from the newest row, black/white percentage endpoints, the
inverted meaning of idle, and click/tap to pause and display device labels.
External iframe content and access rules are unchanged.
The dashboard settings header shows the selected density and edit control without totals for hidden or collapsed widgets (REQ-009).
The authenticated dashboard's Cluster status widget offers the same icon-only
heatmap action in desktop rows and mobile node cards, in both member and admin
views (REQ-025/026). It reuses the public heatmap configuration, node eligibility
and dialog; external frames load only after an explicit click/tap. Missing or
failed configuration hides the optional action/column without blocking status
information. Compact dashboard density still limits the visible node list. The cluster card also
lets a signed-in user choose All servers or With my VPS. This preference is saved
with dashboard settings, without changing density, widget order or collapse.
The personal choice always uses the authenticated account, including admin All
view; it never substitutes a selected member or every accessible VPS. The client
reads the bounded complete keyset collection through the existing generated VPS
Index and joins stable node IDs against public status. Missing relations/status,
failed or incomplete pagination show a localized error rather than an empty or
healthy partial result. A confirmed empty own collection has its own message.
The card's node/location/availability summaries are filtered together, while
public anonymous status and global operational warnings keep their full scope.

Use the same ratio and exception counts on desktop and mobile, with a text summary in place of the redundant location bar. (REQ-009).
Show one availability ratio, remove the nominal banner, and retain outage, maintenance and load or error indicators. (REQ-009).
**Dashboard Summary (REQ-009/010):** the existing single panel is titled Summary
(Souhrn). In My view it shows VPS and DNS zone counts plus the signed-in
account’s paid-until date and monthly membership fee from cached user.current.
The payment-details link stays beside the date, wrapping within that same field.
Wide/medium/narrow layouts use four/two/one columns. Use catalog plural forms
for DNS zones (Czech0/5+/11–14 use DNS zón); no component grammar rules.
Shared date/payment formatters receive the interface locale; dates use the
account time zone. Zero is retained, missing values remain unavailable, and the
monthly amount has no invented currency. No new finance or privileged settings
request is needed. Administrator All view keeps its aggregate resource counts
and dataset item with an explicit scope caption; personal finance is omitted.
Dates remain neutral; this change adds no payment-status calculation.

Label the resource count group once with the actual object scope. Put each resource label and count on a compact wrapping line. (REQ-009).
Align each widget title and its status badges on their text baseline. The same layout applies to essential, hidden and collapsed labels. (REQ-009).
Each widget in dashboard settings groups visibility, movement and collapse under its title (REQ-009).
Dashboard widget headers and content frames use the same inset for the selected
density (REQ-009). Reordering or hiding a widget retains this alignment.
The dashboard density help describes spacing and shorter lists in Czech and English (REQ-009).
The dashboard header shows its title. News and advisory cards omit the generic
subtitles, and compact cluster cards omit the hidden-node footer. The shell account control
shows the login and the shell indicates the active view (REQ-004).
OAuth login/callback/logout preserve a safe return destination and display errors.
The public desktop header and mobile menu offer sign-in without a separate
password-reset shortcut (maintainer decision, 2026-09-30). Password recovery
remains available through sign-in and the login-required/expired-session screen
using the configured provider flow. Token-scoped registration
correction exposes only the request allowed by that token.

**Anonymous theme (REQ-005/009):** the public header offers compact system/light/dark controls, with named selected states and keyboard focus. The mobile navigation menu places the same named theme icons next to the language group. The same local preference survives reload and follows system changes in system mode; no private settings request is made. Tablet navigation uses the menu until the full navigation and preference controls fit.

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
The overview’s All news link aligns with the first title baseline on wider
screens; mobile keeps the stacked header and consistent header/body padding.
The anonymous overview uses the same localized message selection as `/news` and
the authenticated dashboard: explicit cs/en switching updates cached text
immediately, regardless of the browser locale. Missing translations retain the
existing preferred-language/legacy fallback. Public bilingual reads remain
anonymous; existing global locale invalidation/refetch behavior is unchanged.

## VPS creation, detail and power

VPS detail groups identity, ID and state. The title and commands can wrap
while the primary action stays within the viewport.

VPS cards and rows keep the same action order across runtime states. Start
and console share the primary slot. Inactive power controls expose the existing
gate reason. The resource grid aligns CPU, load, RAM and disk. Stopped VPSs
show allocated memory and omit historic runtime memory and load readings.


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

Lifecycle impact cards and the existing after-swap comparison grid wrap long
values within their own columns, including template request identifiers, node
names, dataset paths and complete address/prefix text. Keep the original content,
row/source/target associations, selection, payload construction and confirmation
behavior. A page can fit the viewport while a clipped comparison cell is still
unreadable, so check both document and cell containment at intermediate widths
and on narrow/coarse layouts. This is a REQ-010 presentation correction;
[scope and evidence](../work-log/2026-11-11-lifecycle-value-wrapping.md) distinguish fixture diagnostics
from live permissions and final release verification.

Lifecycle action titles use the regular readable foreground while destructive
choices retain their danger border and explicit action name. Invalid expiration,
reminder and member snooze dates retain their existing localized messages and
submission guards, with readable medium-weight text and a separate danger border
marker. This follows the existing Alert foreground convention; the danger-fill
foreground token is intended for solid buttons and is unsuitable on page surfaces.
See [REQ-010 source and fixture evidence](../work-log/2026-11-11-lifecycle-text-readability.md).

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
Compare unchanged lifecycle datetimes by instant, so UTC/offset or fractional-zero
formatting alone cannot enable Save. Administrator date inputs preserve seconds.
Actual state/date edits and nullable clearing keep the same API payload rules.
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

The VPS resources card uses its heading and edit link. The focused form
opens with its heading and fields. Live-change and separate-save guidance
is inside the performance section, with quota and review near the actions.

A failed reconciliation keeps its existing safety-lock message and verification gate. The feedback remains readable on the warning panel and uses weight and a separate border marker as well as semantic color. It must not release the lock or resubmit the operation merely to dismiss the warning.

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

The [bounded member journey regression](../../e2e/specs/app/approved_vps_journey.spec.ts)
connects list discovery, resource review/rejection/retry, tracked completion,
access-key review and the result on the same VPS. It uses synthetic API data
in cs/en; it does not certify real provisioning or SSH delivery.

### Additional VPS configuration (REQ-023)

Additional configuration groups the hostname, namespace, boot and administrator
controls under short headings inside the existing disclosure. DNS uses its
direct resolver label. Field help, errors and risk indicators stay with the
settings they describe. The DNS shortcut still expands, scrolls to and focuses
the resolver section and shares the same change review.

### Admin-team VPS configuration preference (REQ-023)

Maintenance exposes the legacy `allow_admin_modifications` preference alongside
the weekly schedule. These are independent controls: the preference authorizes
base-system configuration changes, while maintenance windows govern timing.
The description retains the legacy distinction between base-system files and
member applications/data, and the email notice. Radio choices show the current
API boolean; a missing value leaves both unselected and disables writes.
Nothing is changed simply by opening the page or selecting a choice.

Additional configuration uses the same explanation and choices. It retains the
common change review and only includes the preference when deliberately changed.


A deliberate Save sends only `vps.allow_admin_modifications` to the existing VPS
update action. Owner/member and administrator scope, state gates, fresh busy
preflight and durable uncertainty handling remain. The request freezes its VPS
ID and choice before asynchronous lock acquisition. An isolated boolean preference
write may complete synchronously without an action receipt; the API's empty update
chain saves this DB-only field immediately. Confirm it only after a successful
fresh read of that exact VPS returns the requested boolean. If an action receipt
is supplied, validate and track it in Tasks and wait for successful completion
before the same read-back. Malformed supplied receipts, network ambiguity and
other asynchronous updates still fail closed. A rejection retains the draft;
unconfirmed read-back never displays success or creates a fictitious task.
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

The VPS Access tab shows the SSH deployment form, host fingerprints and root
password controls directly. Missing or duplicate keys, missing fingerprints
and blocked operations retain their warnings and recovery actions.

When saved SSH keys are missing, the member link opens their own profile and
the administrator link opens the known VPS owner's keys. With an unknown
owner, the administrator cannot select a key. Server fingerprints are shown
separately for SSH verification. The password form explains generation,
successful activation, copying and removing the password from view.

## Console and VPS deletion

**Intent:** entering Console opens a session directly; intentional replacement and
revocation remain explicit. The original token expiration is a snapshot:
router traffic renews it. The parent checks the existing read-only Show action
every 15 seconds without creating or extending a token. Authoritative denial,
a changed token or a freshly returned expired token removes the terminal;
uncertain validation warns while the router continues enforcing access.
Reconnect reloads the same token. Opening a page must not spawn an uncontrolled retry
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

The VPS overview history action requests the selected window on demand.
Expanded charts show value and account-time axes and keep missing samples
as gaps. A fresh window can be reopened without a duplicate fetch.

## Storage, NAS, snapshots, backup and export

The VPS storage view shows used space against its effective quota. The
manual mount summary links to the mount list and separates configured
access, unknown modes and current states requiring inspection. The root
dataset ID opens its detail and the capability-gated subdataset action
uses that same parent. Short metadata is visible without opening a disclosure.

**Dataset capacity:** list and detail distinguish referenced space / reference quota
from dataset and descendant usage / quota. Each configured positive limit has
its own named value, percentage and bar with shared VPS severity thresholds.
Zero quotas mean no limit; show numeric usage without estimating a capacity
from pool availability. Missing measurements stay unknown, including when a
configured limit is known. Keep both quota names visible once, using infinity
only for an explicit zero limit and an unknown marker for missing data. Do not repeat the reference-quota value in a second
summary row. This changes presentation only, not allocation or API writes.

**Intent:** inspect datasets and usage/quota, create NAS storage, manage snapshots,
schedules/plans and downloads, export datasets and restore from available backups.
VPS root disks remain in VPS detail; member NAS and Backup Center retain separate
navigation. Backup filters remain stable across tab changes.

**Subdataset context:** the creation dialog title includes the complete parent
label (full name, name or existing fallback), including numeric names that differ
from the resource ID. Long unbroken labels wrap inside the title. The redundant
parent/API-ID information box is removed; child name and existing creation fields
remain. API rejection retains the title and draft. Cancel/Escape and reopening
retain existing reset behavior. The exact parent-ID payload and existing
ownership/lifecycle gates remain unchanged.

**Mount lookup feedback:** dataset lookup failures retain the mount draft and
show readable foreground text, medium weight and a separate danger border. The
local form styles its error descendants for both the earlier inline finder and
the current embedded picker. Retry keeps each implementation's existing query
contract; displaying or retrying a lookup sends no mount mutation.

**Filter help (UX-06):** NAS, Backup Center and Tasks expose the same question-mark
button and SmartInputHelp modal, operable by click, touch, Enter and Space.
Closing returns focus without changing the filter or URL. Backup Center explains
local dataset matching on Snapshots/Plans (not snapshot/plan names) and its
distinct download fields on Downloads. Tasks explains case-insensitive matching
on loaded action/transaction labels, IDs and targets, including tracked actions;
it does not search the full history. Existing loading limits and role scopes
remain authoritative. Opening help performs no reads or writes.


**Dataset header:** a dataset-only breadcrumb groups the existing return context
and complete labelled name. The internal ID, existing VPS association and
Busy/Working state remain distinct and wrap without clipping. Preserve plain
heading text for the object document title, contextual Help priority0, existing
return targets and capability-dependent tabs. This chooses no navigation model.


**Backup detail navigation (BAK-05):** opening a dataset from a download or the
snapshot/plan workspace retains the existing Backup Center entry as active.
The URL carries only presentation context, so reload and detail-tab navigation
keep the same fixed `/app/backups` return with the original tab, text filter,
dataset selection, restore intent and snapshot-list parameters. It cannot select
an API owner, trigger an action or supply an arbitrary return URL. A direct
member VPS-dataset URL without this context highlights VPS and retains its
Storage backlink; direct NAS and administrator routes keep their usual context.
This narrow correction does not consolidate navigation or select a NAS-14 model. Dataset
snapshot/download pagination also checks the browser pathname owning its URL
before writing, so an old page cannot replace the destination query during a
rapid return. Other keyset consumers retain their existing behavior.


Export detail presents its summary, allowed hosts and mount instructions as
full-width sections in that order. Hosts remain a compact table on desktop;
narrow screens use labeled rows with reachable edit/delete actions. The mount
command, fstab entry, systemd mount unit and NixOS configuration are stacked
vertically at every width, with a compact Copy button beside each example
heading, including the mount command. Long
code lines may scroll inside their block without widening the page. Temporary
snapshot exports continue to show only their temporary mount instructions.

**NAS parent selection:** creation derives its effective parent from the current
owned/capability-filtered choices. A sole offered parent is selected; several
choices keep the placeholder until the user chooses. A valid explicit choice
survives option refreshes. An unavailable choice clears when several remain,
or becomes the sole current option. The visible select, submit availability
and existing dataset payload use the same effective ID. No parent means no
creation form. Ownership filters do not certify API user_create permissions;
the backend retains its existing ownership and user_create enforcement.

**Export conflict feedback:** a definitive HTTP200/status-false Create receipt
with the verified dataset/snapshot already-exported reason stays in a bounded
alert above the dialog actions. Explain the conflict in Czech/English and link
to the submitted dataset exports or snapshots. Capture the submitted form so
later edits cannot redirect this receipt. Keep drafts, Cancel and existing
submission/role/owner/lock rules. Other API, lookup, permission, protocol or
uncertain failures are never relabeled as duplication; they retain their reason.
No implicit retry, export removal or backend timing change.

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

Host-address creation wraps long route values, failed addresses and validation text inside the existing dialog and surrounding network failure panel. A rejected request keeps the complete remaining address input and existing partial-batch explanation; layout does not change the submitted address bytes or retry sequence.

The DNS record editor accepts the API-supported bare `*` owner, including A,
AAAA and TXT records. It preserves the existing `*.subdomain` owner syntax and
rejects embedded, repeated or non-leading wildcard labels. This is an owner-name
check only: content, TTL, record-set conflicts, permissions and the unchanged
API request/error handling remain authoritative. An API rejection retains the
draft and field error; an intercepted save does not prove live DNS publication.
[Prepared wildcard verification](../work-log/2026-11-12-dns-bare-wildcard.md).

For secondary zones, the list and detail show DNSSEC management on the primary
server; the local enable flag cannot establish the transferred zone's signing
status. Settings explains that boundary and omits the signing checkbox and
`dnssec_enabled` update parameter for secondary zones. An explicit secondary
DNSSEC URL shows the same explanation without requesting local keys or claiming
that the zone is unsigned. Primary true/false settings, controls and key views
retain their existing behavior; missing status is unknown. DNSSEC filters retain
the API configuration predicate and the help calls it a setting. This does not
select the separate DNS-01 zone-naming models.
[Scope and verification](../work-log/2026-11-12-secondary-dnssec-management.md).

DNS-zone creation keeps a stable top inset as primary/secondary fields change.
The form remains horizontally centered, bounds its height to the visual viewport
and scrolls its body while retaining the footer, focus/close behavior, draft
values and existing Create/role contracts. Other Modal callers retain their
default vertical centering (approved DNS-05 / REQ-049).

Monthly traffic and live network graphs expose visible time/value axes. Keep IEC byte totals distinct from IEC bytes per second, and preserve the existing formats, owner/filter queries, rate calculation, polling and bounded session history. Keyboard/touch point inspection retains the exact sample, including a single first measurement. Keep its selection while focused; Escape or blur dismisses it and unfocused hover clears on leaving; distinguish a measured zero from empty history. The same display applies in member/My and administrator live views. [Approved NET-14 scope](../work-log/2026-11-15-network-chart-orientation.md).

**Intent:** create/edit zones and records, configure transfers, servers, TSIG and
DNSSEC, inspect logs, and manage relevant IP/interface/resolver resources.
Administrators also have network/address inventories and allocation operations.

The VPS Network tab identifies a disabled VPS network in its header and
shows the consequence near the summary. An individual disabled interface
carries its own badge, including in member view.

**Success contract:** UI save and DNS publication are separate evidence. Real
publication tests query the actual isolated DNS service after the transaction.
Respect supported record types, TTL and payload fields; preserve zone context on
errors. Secret-bearing keys must be scrubbed from diagnostics. IP assignment
history must not lose entries due to a false cursor assumption.
[DNS](../../src/lib/api/dns.ts), [transfers](../../src/lib/api/dnsTransfers.ts),
[interfaces](../../src/lib/api/networkInterfaces.ts), [IP history](../../src/lib/api/ipAddresses.ts).

In the VPS overview, the Network card keeps each address selectable as text.
The adjacent copy control copies the whole displayed address and prefix.
Keyboard and touch use the same control with success and failure feedback.

The VPS Network summary keeps Refresh at the right edge when the status
badge changes. Its month-to-date traffic card shows the period once and puts
incoming and outgoing totals side by side. Only measured zero is displayed
as zero. Missing values and accounting request errors are reported separately.

### Admin IP owner search

In Network → IP addresses, a bare positive number filters allocations by that
member ID; it does not open an unrelated IP resource with the same ID. The first
localized suggestion applies that owner filter. `#ID`, `id:ID` and the explicit
Open IP suggestion still open IP detail. Exact addresses and login lookup retain
their existing meanings. Numeric `q:` and legacy `q` URLs resolve directly to
`user`, without a login lookup or unsupported API query parameter.

Owner selection resets cursors/local pagination and retains other explicit
filters. Without an explicit occupancy constraint, owned assigned and detached
IPv4/IPv6 allocations (including historical prefixes) stay visible. Queries and
reload/copy/back links preserve owner scope; unknown/failed login lookups never
fall back to a broad inventory. Existing administrator-only owner-filter and
route guards remain authoritative. [Review evidence](../work-log/2026-10-28-ip-search-owner.md).

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

The VPS Network tab places the numbered route and host address steps on the
cards that contain their actions. Assigned routes display the exact interface
inline. A configured PTR appears by the host address; the Add or Edit PTR
action still follows the existing gate.

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
blocks. IPv4 retains three suggestions per type and primary location. The suggestion cache key includes the prefix.

IP rows and mobile cards expose four icon-only links in a single compact row:
Incidents, Assignment history, Edit, and Remove from VPS (Assign to VPS for an
unassigned address). Incidents and history retain the exact IP filter. Edit
opens the complete address detail with ownership and host addresses; the last
link opens a VPS-first assignment dialog for an unassigned address. Assigned
addresses retain the routing section and existing confirmation before removal.
The assignment dialog takes a VPS ID or hostname lookup first, loads that VPS's
interfaces and shows owner/environment as read-only context. No ownership or
environment update is a prerequisite. Re-read the IP, VPS owner and interfaces
before submitting the reviewed interface. Never transfer an IP owned by another
member implicitly. Preserve route-only and route-with-host-address actions. Navigation never mutates an address. The controls use 20px icons,
compact desktop buttons and at least 44px touch targets. Localized tooltips and
accessible names identify each action without visible text beside the icons.
The desktop action column reserves only the width needed for those four controls.

Free-IP suggestions continue after full pages from associated networks whose
primary location differs. They stop once three eligible candidates are found,
a short page ends the result, or a 20-page safety bound is reached. Invalid
cursors or a scan-bound failure remain visible, rather than claiming no free
addresses exist. This is a bounded sample, not an exhaustive inventory.

Free-IP suggestions have a 12-second budget per query, including capability
discovery and all continuation pages. A timed-out query shows the existing error or partial-results state
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

The navigation countdown and Never expires control open the session length
popover below the navigation control, using the account menu surface. It starts with the current preference. It offers 20 and
40 minutes, no expiry and a custom number of minutes. Save updates only the
current account's preferred session length. Cancel discards the draft. The
profile security page remains a separate entry to the same preference.
The nickname button opens the account popover. Account follows the existing
personal route callback, including administrator aliases. Logout retains its
configured native URL. Administrators with scope access can switch views here.
The passive badge beside the nickname follows the current route mode. Support
access and existing routing capabilities are unchanged.
The popover fits the viewport and scrolls internally on short screens. Escape
returns focus to the nickname. Session length remains separately accessible
(REQ-004/009/010/012).

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

**Account overview copy (2026-11-07):** Keep the time-zone controls and current/browser values visible, without the redundant subtitle, formatting description or generic Tips card. Remove the matching Czech and English catalog entries.

**Personal scope (maintainer decision, 2026-09-30):** Account from the header
always means the authenticated account, in both member and administrator layouts.
Admin privileges do not turn these pages into global lists. Sessions and metrics
pass the current user to the API for administrators; non-administrators use the
API's enforced owner restriction (metrics rejects an explicit user input for
those roles). Session exact-ID lookup must match that same owner. Namespace/map
deep links verify ownership before mounting their detail, entry queries or actions.
The separate `/admin/users/:id` dossier continues to target its selected user.

Namespace and map filters retain a200px minimum smart field at a320px viewport.
The labeled Help control wraps when needed; filter grammar, focus restoration,
owner queries, advanced/clear actions and mutation callbacks remain unchanged.

**Scope audit:** profile/security, resource usage, SSH keys, MFA/known devices and
mail preferences already pass the authenticated ID through user-scoped paths or
panels. Namespace/map lists already fix the current owner. User-data passes the
admin owner filter; its separate backend filtering/pagination limitation remains
REQ-042 and is not certified fixed by this change. This is a source/fixture audit,
not a claim of live API authorization certification.

**Secret presentation (approved UX-03):** Single-line masked fields and adjacent
Reveal/Copy actions share36px desktop height and the existing44px coarse-pointer
minimum. Multiline fields keep compact actions. Reveal/hide, explicit exact copy,
keyboard focus and owner-bound workflows retain their contracts.

**Selected-user User data (2026-11-11, REQ-001):** The administrative dossier
must not label the support operator's own templates as another member's data.
Mount the existing panel for global administrators or when the selected user is
the authenticated account. Otherwise render the existing localized permission
message without requesting template data or mounting create/edit/deploy/delete.
The API's existing non-administrator owner restriction and blacklist of the user
filter remain authoritative. Administrators retain their selected-owner filter
and create owner; support on its own dossier retains the implicit current owner.
Member/My profile and VPS initialization consumers are unchanged. This is a UI
context guard, not an API privilege change. [Evidence and limits](../work-log/2026-11-11-selected-userdata-owner-guard.md).

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

The Packages tab also shows an Assigned timestamp beneath each assignment name
(REQ-040). This is `UserClusterResourcePackage.created_at`, formatted in the
signed-in operator's account time zone, independently of the selected member's
zone. Show a dash when absent; never infer it from the shared definition's
creation or the assignment's last edit. Keep the summary grouped by package and
retain existing selection, add/edit/remove controls.

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

On wide Finance overviews the queue table and monthly assessment distribution
share a top edge below the queue filters. On narrower screens the sections stack.

In the administrator's member overview, the source number in each recent payment
is a direct link to its incoming-payment detail, matching the member Payments
history. Manual credits without an incoming source do not get a fabricated link.
The overview retains its administrator-only finance gate. Browser Back returns
to the member overview; the detail's own Back link retains its finance destination.

After an administrator changes the paid-until date, refresh the account payment
history and show the previous and new dates and the administrator on a row
without an amount. The account history requests these changes only when the
API advertises support. The finance ledger and the member's payment list
continue to request actual payments.

The administrator incoming payment detail shows the payer account when the bank
provided it. Previously imported payments can have an empty account number.

The member Payments header and monthly-amount/reference cards use concise labels
without their redundant explanatory subtitles. The shared reference label is
`VS / ID` in both languages, including the administrator's member-payment view.
Its value remains the existing member ID; paid-until status and API-provided
banking instructions keep their existing meaning and behavior.

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

The OOM report Processes tab uses shared keyset pagination (25/50/100 visible
rows, default100). Requests add one look-ahead row, staying below the API's1000
maximum. The ascending cursor is the largest displayed task ID; the extra row
is not skipped on the next page. Previous/visited pages, reload/deep links and
page-size reset reuse the shared pagination contract. Query identity includes
the report, view, cursor and size; abort signals reach the generated SDK. A failed
page renders an error/retry state rather than stale processes. This fixes
[issue103](https://github.com/vpsfreecz/vpsadmin-webui/issues/103); the original
fixed2000 request was invalid and reducing it to1000 alone would leave later
processes unreachable. Report authorization remains entirely API-owned.

The transaction chain search, help, advanced filters, copy-link and clear
actions form one aligned control row. Filtering preserves the URL and active
chips, and help and advanced controls open their existing dialogs.

The member VPS overview requests the latest three OOM reports for that VPS.
Each row links to the report and shows when it was created. Past events remain
historical. Loading, no reports and failed requests have distinct states.

The VPS overview aligns recent operations with localized timestamps and states.
Long names wrap within the card. The activity button opens transaction chains
filtered by the current VPS.

The Tasks View all link closes the panel after ordinary pointer or keyboard
activation and focuses the destination main content, including the current
transactions route. Modified link clicks preserve browser behavior. The static
Your actions label is omitted in both locales; filtering feedback, progress,
transaction context and background-activity disclosure remain available.
Opening the panel again retains tracked work.


Incident filters use a short ID-or-filter hint with readable Help and Advanced
labels. The smart field grows with available width and fills a narrow row;
all filter actions share44px controls. Existing exact-key filtering, ID opening,
question-mark help, role restrictions and pending-router snapshots remain.
Incident detail keeps distinct detection/reporting times and the reporter in
Summary, without a duplicate header metadata row. Preserve original context
links and role-specific fields. Complete report text wraps and grows with the
page, without a nested vertical scroller or content truncation.
See the [bounded reading change](../work-log/2026-11-15-incident-filter-message.md).

Incident explicit page navigation and page-size changes use the same applied
exact filter snapshot as the URL writer, including all administrator filters.
They retain those filters while the router is still publishing a prior URL.
URL normalization and browser history continue to use actual router params;
role filtering, API fields and cursor/visited-page behavior remain unchanged.
See the [caller correction](../work-log/2026-11-12-incident-pending-filter-navigation.md).

Transaction history uses compact aligned ID/time/owner/object/action/state
columns on desktop and folds metadata under the action on small screens. The
owner column appears only in administrator mode; a normal member and an admin's
My view do not repeat their own identity in every row. This is presentation only:
server scope, owner/session filters and authorization are unchanged. Pinned chains
use the warning/orange row tint and the existing unpin control without a
separate pinned badge or extra row height; failed chains retain the
red tint even when pinned. Transaction tables use opaque semantic alert
backgrounds for these warm tints, including hover, instead of the blue-theme
general row blends; other tables retain their palette. The pin control exposes its pressed state and toggles
back to Unpin. Completed unpinned chains remain neutral. Known progress always includes
counts and percentages, including completed/failed chains. ID
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
remains highlighted. Tasks applies the same priorities to tracked actions: compact
neutral completed cards show title/state, one receipt/chain reference, target,
creation time and step count. The title opens inspection with both timestamps,
backend details and chain navigation. Matching action/chain IDs appear once;
different IDs remain distinguishable. Tasks has no pin/unpin controls or pinned
sections, including inspection and background chains; existing stored pins remain
scoped for transaction/history pages. Hide uses a labelled 44px coarse-pointer
icon button. Known progress includes counts and percentage even when completed. Active progress bars and failure summaries remain
visible; no completed 100% bar or repeated update-time line consumes history
space. Cancellation still requires confirmation and the current API capability.
Search, account-scoped persistence, receipt merging and polling are unchanged.

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

On the first page of a chain-scoped item list, one failed step opens
automatically, falling back to an unfinished step or the first available step.
The API still determines which payload fields are available for the account.
Individual steps can be opened or closed with their existing controls.

Transaction item detail displays input and output vertically at full width.
The input has a large, bounded reading area; JSON fields are separated and string
values retain real line breaks, so embedded email bodies can be read normally.
Long tokens wrap inside the panel. HTML is always text, never rendered content.
Copy retains the original payload and the raw transaction JSON remains available.
Plain text, malformed JSON and unsafe numeric JSON fall back to verbatim text.
Inline transaction previews retain their existing compact layout.

Place Create VPS beside the filter actions with the shared control height, keeping the existing role-aware destination. (REQ-010).
Give filter help a labeled 44-pixel control beside the input, with a plain search placeholder. Retain the question-mark shortcut. (REQ-010).
The VPS list separates uptime from transaction activity. A running VPS displays
elapsed runtime; a stopped VPS displays a dash. Locks remain in the status badges.
VPS list identities keep long hostnames inside their column. On mobile the ID
aligns with the hostname, then actions appear before resource and location details.
VPS list usage pairs express used and allocated memory or disk in the same unit.
The VPS list marks a VPS with a failed or fatal transaction chain only when the
chain was created within the last 7 days (REQ-074). Failed chains stay failed
until an administrator resolves them, so an older failure would otherwise flag
a working VPS indefinitely. The badge links to the chain detail; its tooltip
gives the operation and creation time. A stopped VPS has a neutral power badge.
Its row and dot still surface usage warnings and recent failures.

**Contract:** action state, transaction and object state are related but not
interchangeable. Unknown/stale locks must be shown as such. Users see permitted
objects; session filters and pagination must retain context. Large cgroup/SSH/task
identifiers must wrap or scroll appropriately on mobile. Monitoring decisions and
incident creation keep failed submissions retryable where safe.

The VPS Incident policies tab discovers all configured policies, including those
with zero matches. Each compact section shows the API-provided label and
description, current status and filtered history. Two rows show Period / Incidents
/ Limit / Action for the warning and VPS-stop periods supplied by the API. The separate Incident reports tab opens the
existing VPS-filtered report list; both destinations preserve app/admin and owner
context. Current declared limits and overrides remain distinct from saved
historical decisions. Configuration errors use normal error feedback, not guessed
zero thresholds. Overview alerts and desktop and mobile indicators appear only
when warning or shutdown thresholds are reached and link to the tab; ordinary resource and
physical-action warnings remain visible.

Administrator policy-limit drafts and the single shared shutdown-permission form
are independent. Each limit field shows its effective numeric value and an
Inherited/Custom choice. An untouched inherited field sends null even when the
other field changes; a custom value remains custom even if it equals the default.
Changing a custom field to inheritance shows a pending value until authoritative
readback supplies the inherited limit. Inheritance changes only the draft until
an explicit, confirmed Save. Policy details and shared settings stay visible.
Threshold values include the report count and supplied period. The card header
retains its border; the editor adds none. Sent notices omit the delivery caveat.
The forms preserve preflight, durable locks for uncertain writes, exact resource
readback and drafts after failure. Shared permission, cooldown, confirmed stop
and outstanding physical action appear once, outside policy sections. Cooldown permits a new qualifying incident;
it never schedules a shutdown. App/admin scope and originating-owner list context
survive navigation. API resource capability gates the feature; no old
selected-policy fallback exists.

Incident detail shows authorized saved evaluations with `matched=true` and state
`recorded` or `audit_only` in stable key order. Each section uses its saved periods,
counts and limits. With an authorized VPS association, active keys link to the VPS
policy anchor and retired keys retain filtered-history links. False or null
membership and error states appear only in administrator diagnostics; they do not
produce member policy sections. Missing capability or data produces neutral
feedback. An empty member response can hide private errors for matched policies,
so it also shows unavailable feedback. Only exhaustive saved evidence establishes
that no policies matched. Lists make no request per row.
Notices show their saved originating policy key and label separately from trigger
navigation and mail progress. See [generic policy contracts](API_CONTRACTS.md#generic-incident-policies)
and [the revision record](../work-log/2026-11-17-generic-incident-policies.md).

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

OOM Refresh reads the current query again, preserving its filter, owner and
pagination context. It never navigates to a different list. A rejected read
retains the current URL and the existing Retry action. NAS and member-request
manual refresh controls remain until their separate update/recovery audit is
complete. Administrator requests already use the slow visibility-aware refresh
tier; this OOM fix does not change their behavior.

[Transactions](../../src/lib/api/transactions.ts),
[monitoring](../../src/lib/api/monitoring.ts), [incidents](../../src/lib/api/incidents.ts),
[OOM](../../src/lib/api/oom.ts).

### Administrator incident overview and history

The administrator Incidents menu opens Overview, with Reports and History as
adjacent tabs. Overview lists all current matches across active policies,
including stopped VPSes and counts below the thresholds. The backend filters and
sorts all VPS/policy pairs before returning a page. Rows show incident counts and
how many reports remain before a threshold, alongside modes, permissions, owner
and transfer restrictions, cooldowns and shared actions. These values do not
predict the next action.

Reports keeps its existing URL, filters and creation/detail links. Member,
support and per-VPS views retain their behavior. History shows saved evaluations
alongside the latest action and email outcomes, including retired policies and
original owners. Its unresolved-actions view includes outstanding work of any
age. A request to shut down a VPS and a confirmed shutdown are separate facts;
several policy rows can refer to one shared shutdown. Email state `sent` means
acceptance by the mail server, without proof of inbox delivery.

Each new view requires the administrator role and its authorized generated action,
fields and metadata. Its pagination preserves the echoed cutoff in the URL;
Refresh obtains a new cutoff. Settings and outcomes still reflect the latest
read. See [the API contract](API_CONTRACTS.md#administrator-overview-and-recorded-history).

Overview has four desktop columns: VPS and policy, incident counts, status and the
latest recorded outcome. Mobile cards show the same summary. Each count line shows
the count, limit and period, with the supplied remaining count alongside it.
Details holds modes, permissions, node, accounting dates, cooldowns, timestamps,
identifiers and evidence links. It starts closed and needs no additional request.

History leads with the evaluation time, report, VPS and policy. The decision and
counts recorded at evaluation are separate from the current action and email
outcome. If no reason for decision `none` was recorded, the page does not infer one.
Owner, policy key, detection time and other saved settings are available in Details.

Overview keeps policy, status and sort controls visible; History keeps policy,
scope and period visible. More filters contains IDs, modes, permissions, action
and email states, and direction where supported. Its controls retain their values
and remain enabled while collapsed; active refinements open it. Both pages show a
compact cutoff, with the last-read timestamp in a disclosure. History also shows
its selected period. The long explanatory banners are omitted.

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
Storage pool headers keep the full pool label readable, including long Czech
names and unbroken labels at 320px. Wrapping retains the visible pool ID, state
badge and checked time inside the card; maintenance gates stay unchanged
(REQ-010).
Sysctl history distinguishes missing observations, explicit unavailability and
explicitly unconfigured values. A match or difference requires an available
observation and actual configured/effective strings; missing values never imply
a match.
[Nodes](../../src/lib/api/nodes.ts), [history](../../src/lib/api/nodeHistory.ts),
[cluster](../../src/lib/api/cluster.ts), [migrations](../../src/lib/api/migrations.ts).

## Security advisories, audit, mail and content

**Intent:** members/public read applicable advisories; admins manage advisories,
updates, relations and associated outages/rebuilds. Audit history supports
operational investigation. Mail administration covers templates/translations,
mailboxes/handlers, recipients and delivery logs. Content includes news and
contextual help boxes. Page help opens from the main heading in the shared centered dialog. Whole-template and standalone-recipient deletion are
intentionally blocked pending safe backend relation handling; translations and
template-recipient membership have separate supported delete operations. See
[the deletion boundary](ACTION_CONTRACTS.md#deliberately-blocked-mail-deletion).

Original advisory corrections are available in draft, published and retracted
states. They update the original report without posting an announcement or
sending email. Publication remains draft-only. The existing published advisory
update flow keeps its own explicit mail, state and publication-time options.

Editors capture a coherent parent/child snapshot and its content revision and
state. API capabilities are checked through authenticated OPTIONS before the
selected workflow's first write. Parent/CVE and bulk node requests are sequential,
with one expected revision per acknowledged correction. They are separate
transactions: completed work remains if a later request fails. Keep unsaved
values and show the error; close, reload and review before resuming a refused or
uncertain operation. A failed draft-child save opens the existing created draft
instead of offering to create another parent.

Publication and mitigation inputs retain seconds and preserve null. Editing can
leave zero CVEs or missing node assessments; only explicit add/bulk operations
create rows. Existing retired-node assessments remain removable. Node notes use
localized fields. A bulk note field stays disabled until its language's update
checkbox is selected. Unchecked languages retain their existing notes. Selected text is trimmed
and replaces the note; a selected blank field clears it.
Unchecking retains the draft but omits that language from the write. Cancelling
and reopening bulk resets its note choices; cancelling only the confirmation
retains them. The single-node editor preserves languages it does not edit.
Published and retracted node writes offer resolved states and require both
mitigation times when mitigated. A correction refreshes affected-user/VPS and
public caches.

Direct retraction is silent, preserves history and affected projections, and is
available only while published. Deletion is available in every state and its
confirmation describes the permanent loss of the advisory, updates and node
assessments. Navigate away only after acknowledged deletion. An uncertain
response remains an error, without automatic retry.

The admin advisory list uses padded cells and aligned column headings, including
the first advisory column and the final action column. Numeric counts remain
right-aligned. On narrow screens the table scrolls inside its card so all columns
and the Open action stay reachable without widening the page.

Advisory parent writes and CVE changes are separate steps. If CVE work stops
after a parent write succeeds, the editor retains that advisory's identity and
requested CVEs, with accepted changes and remaining intentions requiring review.
An uncertain send stays in the review set. The accepted parent is not created
again to recover the child failure. Further changes require reviewing the current
advisory. Review closes the edit dialog and refreshes current detail while keeping
the stopped intention. Stopped node batches also require review rather than
claiming safe continuation.

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

The sidebar uses a short Search placeholder. The full palette lists examples of searchable objects.
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

### Lookup popover touch bounds (2026-10-28)

REQ-010: user/node suggestions remain inside the visual viewport and clipping
ancestors, opening upwards or reducing their internal scroll height as needed.
Reposition on viewport/ancestor resize and scroll. Keep focus trapping, keyboard
selection, outside blur, native completed-click activation and query scoping;
never select on touch-down or replay an uncertain tap. See the
[mobile follow-up](../work-log/2026-10-28-mobile-safari-first-tap.md).


### VPS overview access shortcuts

Use the header to copy SSH or open the console, and the Access tab for SSH keys
and password management. The overview does not repeat those entry points or
current runtime values in a separate card. Historical charts remain on demand.

## Contextual page help (UX-05; REQ-053)

The shell resolves the existing page/action and public or authenticated query.
Nonblank results attach one localized help button to the shared primary heading;
object headings take precedence, and a page-level read error supplies a fallback
anchor when its normal heading cannot render. Public titles that were clipped
stay clipped without help. Console pages do not request contextual help.

Open the large centered Modal with the original ordered, sandboxed HTML. Long
content scrolls in the modal body. The header close action, footer Close,
Escape and backdrop use the normal close flow and restore focus. Chromium
forwards Escape from sandboxed links; tested mobile WebKit uses native Tab back
to the dialog controls because it does not dispatch that key in the script-free
frame. Navigation closes the old help without remounting page drafts.
The existing admin UI permission controls Manage help boxes, and its link keeps
the exact page/action filter. No backend, language selection or access contract
changes. The old local Top/Bottom and expanded values no longer drive rendering;
interface and profile settings omit the obsolete placement control.

## Monitoring state deadlines and decisions (approved MON-01/02)

State deadline identifies the maximum duration of acknowledgement/ignore state,
re-evaluated by the next report after expiry. It is not a record-retention date.
Explicit null means no time limit for these states; missing data stays unknown.
Acknowledgement suppresses repeated problem alerts while retaining result logs
and closure on success. Ignore suppresses alerts and skips logging/state updates
from further results while ignored. Finite and unlimited choices retain the
existing API request, native validation, pending and retry gates. Invalid custom
dates do not display an unlimited-duration preview. See REQ-051 and
[scope/source evidence](../work-log/2026-11-15-monitoring-state-meaning.md).

## Approved account follow-up: ACC-08

Use the common secondary button for both effective-recipient Copy actions, preserving exact comma-separated clipboard contents, contextual accessible names, success/failure feedback and mouse, touch and keyboard behavior. No recipient selection, precedence, mutation or mail-setting contract changes.

## Approved account follow-up: ACC-05

Place each preference description below its associated control, in the same named and described group. Preserve selector callbacks, persistence, scope choices and the existing readable synchronization errors.

## Approved account follow-up: ACC-09

Keep one primary Create template entry in the filter bar for both empty and populated lists. Remove the redundant empty-state entry and its unused list callback. Preserve editor validation, existing filter/query/owner policy, creation payloads, deploy/delete guards and the existing readable length error.


## OOM filters during pending navigation

Explicit Next/Previous/numbered-page and page-size actions use the same applied
filter snapshot as the list request, even before a router transition publishes
new search params. URL hydration and automatic cursor normalization continue to
follow the router for Back/Forward. Owner-scope and API contracts remain unchanged.
See [the reproduced race](../work-log/2026-11-09-oom-pending-filter-navigation.md).

### Namespace controls: approved review NSP-01 through NSP-04

Namespace and map lists share presentation, keeping their own API parameters,
owner/role guards, numeric navigation, URL filters and pagination. Labeled Help
and secondary Clear filters match the common list pattern. The placeholder says
ID or filter; it does not promise unsupported free-text label search. Existing
help retains supported keys and role-specific examples. Detail drops the generic
quick-links subtitle and retains the actual View maps link and scope gate.
Map Open remains a real link; Delete remains an explicit confirmation with its
existing pending/error/retry behavior. New-map Cancel precedes Create in visual
and tab order at the right edge. Creation payload and pending guard are unchanged.

## Kernel OOM reading and read-error recovery

The kernel OOM list names its source explicitly. Detail uses one report heading;
Summary retains distinct creation/reporting times, VPS/node, full cgroup,
killed/invoking process, count and rule. Tabs retain usages, statistics and
bounded process pages. Process-read errors align Retry, Back, Service overview
and Copy details at the trailing edge. The overview link retains `/` and its
existing authenticated redirect to `/app`; copying retains full diagnostics
and Details remains a native keyboard disclosure. These are recovery/navigation actions, not process
mutations. Other error surfaces retain default presentation. See the
[approved OOM follow-up](../work-log/2026-11-15-oom-reading-recovery.md).


### Resources: additional configuration (RES-04)

Resources opens the additional configuration fields immediately, as the general
Configuration route already does. Native details toggling remains available by
pointer and keyboard; it does not save, reset a draft or remember a preference.
Administrator fields retain their existing role gate and order.

Query-only navigation from Resources to general Configuration reuses the same
component. Restore the open default for the new location without resetting the
draft. Ordinary field edits and native toggles do not reset the disclosure.

Tasks background-activity disclosure places the action below its explanation
so both Show and Hide labels fit the fixed control height in the narrow drawer.
This layout preserves the existing role-dependent scope and collapsed state.

## Shared foreground readability

Operational links retain their navigation, ownership and query contracts while
using readable text foregrounds in normal, focus and hover states. Empty enabled
fields use the tertiary hint role; actual values, disabled controls and pending
cancellation retain their behavior. Explicit light/dark and system preference
require actual rendered checks. See the [source and evidence boundaries](../work-log/2026-11-10-readable-link-and-placeholder-foregrounds.md).

### Export list: complete values in responsive results

Export rows and cards retain the same dataset/snapshot label, complete address
and path, owner visibility and detail destination. A narrow desktop table
scrolls within its card; mobile cards wrap full values rather than expanding
the page. Disabled export state remains explicit in its badge and row variant.
[Containment correction and evidence](../work-log/2026-11-10-export-list-value-containment.md).

### VPS list: readable context and resource annotations

Long owner/node identities stay within the context cell beside resource
values; warning rows keep legible numeric usage labels. Mobile metadata's
existing intentional truncation and all navigation, role, scope, filter,
pagination, action and resource-pressure contracts remain unchanged.
[Presentation evidence and source variants](../work-log/2026-11-10-vps-list-context-readability.md).

### Shared error recovery action alignment

Error recovery preserves the original retry, back, status, details and copy behavior. Matching action heights apply to the shared recovery row without changing error classification, navigation or retry policy.


### Selected-owner reminder layout

The account lifecycle reminder retains its native date/time control and complete
value at narrow widths. Clear wraps below when both controls cannot fit; control
heights, keyboard order, nullable clearing, presets and confirmation remain. This
is presentation acceptance for REQ-010; fixture evidence does not certify API
permissions, native picker behavior on a physical device or the whole account audit.


### Selected-owner package read recovery

Package assignment choices retain independent environment and shared-package
queries. Show their loading/error state below the relevant labelled field and
retry only that query without clearing the comment or the other choices. Item
queries remain keyed by package ID; show read errors separately from a successful
empty item list and preserve cached badges when a background refresh fails.
Keep selected-owner filtering, the null shared-package owner and existing
assignment/removal payloads. This is REQ-011 read feedback, not a permission
change or a claim that fixture requests establish live access.

## Selected-owner package footer alignment (REQ-010)

Keep Cancel and Add package in one explicit wrapping action group. While a
fixture-held assignment shows its spinner, both actions retain equal heights
and top alignment with visible separation. Normal, pending and rejected states
remain contained at narrow widths; rejection preserves the chosen environment,
package and comment. Pending dismissal/duplicates and exact owner/payload rules
remain unchanged. This is a local package-form layout correction, not a shared
button, API or role change. [Evidence and gates](../work-log/2026-11-11-resource-form-footer-alignment.md).


### Root dataset header containment (REQ-010)

The root dataset card keeps its identity and capability-gated actions within the
card at intermediate viewport widths. Header actions may move to a new row; role
gates, destinations and dataset IDs do not change.

Invalid root-SSD size feedback remains readable while native invalid state and
submission guards stay active. A valid size clears the local message without
submitting the draft.


## Selected-user history view selection (REQ-010)

Changes to user and Actions by user are toggle buttons with explicit pressed
state. Pointer selection and Space/Enter activation update that state together
with the existing view parameter. Filters, selected-user scope and pagination
retain their existing contracts. This makes the current mode available through
semantic state as well as the highlighted appearance; native assistive speech
output still requires device review.


### Dataset identity (NAS-06)

NAS and general dataset list/detail routes distinguish the dataset name from
its internal ID, including numeric names. Desktop lists retain the Name column;
mobile cards and detail headings explicitly name the dataset, and both surfaces
label the internal ID. Links and API requests use that ID, never the displayed
name. Role and owner gates, filters and mutations remain unchanged.

## Find VPS actions on the page (DET-02; REQ-023)

The VPS header offers All actions alongside its existing controls. It opens the
existing lifecycle action index, where actions are ordinary rendered links in
the existing user/admin groups, available to browser Find. The shortcut keeps
the same member/list context and permission gate as the index. Selecting an
index entry only opens its existing form; existing confirmation and mutation
guards remain authoritative. Read-only support in the admin view has no shortcut.

## Interpret VPS memory utilization

Report allocated and measured memory neutrally. Used memory alone does not
measure available memory, cache or pressure and never proves an OOM. Keep disk
capacity and failed-operation warnings. Show a recent documented OOM with its
creation time and a direct report link, not an inferred current pressure state.
Fetch at most 100 OOM reports created in the last 24 hours for the list, with
admin owner/My-view scope when applicable, and one for an individual VPS. Only
match valid report/VPS IDs and timestamps; expire cached events every minute
even if refresh fails. An empty, failed or bounded query is not a healthy-state
assertion. This changes neither API permissions nor report retention.

## Select a dataset for a VPS mount

STO-03 replaces numeric/name entry with an explicit candidate and confirmation.
For vpsAdminOS, restrict candidates to active subdatasets of the loaded VPS root,
its owner and the hypervisor role. API authorization and the transaction's node
compatibility checks remain authoritative. A remote NAS must be mounted via NFS
inside the VPS. Selecting a local subdataset defaults the draft to bind; review
and Create stay separate, with existing role/busy/action-state safeguards.

Dataset#index sorts by full_name while HaveAPI 0.32.2 uses an ID cursor. Avoid
that mismatch with one subtree snapshot (limit 1000), then local search and
25-item pagination. Check total_count against the response; an incomplete or
capped response without count cannot masquerade as a complete list. In that
case use the existing exact-name lookup, owner-filtered for admins, and recheck
root prefix/owner/active state, then recheck the candidate through the hypervisor
index with its own subtree and limit 1 before explicit selection. This is not a backend
permission change. Changing lookup or target context clears any prior selection;
late responses cannot select a dataset. Failure/empty states block Create.

## NAS and dataset filter dimensions

The shared dataset list keeps the smart search field, help, advanced filters,
copy-link and conditional clear controls at 44 CSS pixels, using the same
button typography as the existing VPS and transaction filter follow-ups.
Keep the active chips below the control row. On narrow screens the row wraps
and every action stays reachable. Help remains inside the field; its trigger
keeps its label and keyboard position. The search, advanced modal, exact URL
copy and clear actions retain their existing behavior.

This local UX-03 follow-up applies to member NAS, administrator NAS and the
general administrator dataset list. Preserve the NAS primary-role preset,
owner restrictions, VPS filter visibility, API requests and pagination. It
does not change DNS work, global control sizes or other advanced forms, and
does not complete the application-wide UX-03 umbrella.

## Export list filter dimensions

Keep the export smart input, help, copy-link, conditional clear and refresh
controls 44 CSS pixels high in member and global administrator lists. Help
uses a square target; mobile retains wrapping and active chips below the row.
This UX-03 / REQ-073 follow-up changes only local control classes. Preserve
owner restrictions, supported id/user smart syntax, unsupported-filter errors,
URL normalization, cursor pagination, refresh and exact link copy. Do not add
API filters, change export creation or NFS settings, or resize global controls.
The wider UX-03 umbrella remains partial.

Visual review also found the administrator owner lookup at 36px beside the
44px field. A local descendant class makes that input 44px without changing
the shared lookup component. The focused browser check covers its height;
existing owner lookup focus/filter contract checks remain unchanged.

## OOM report filter dimensions (approved TODO UX-03)

Help, advanced filters, copy-link and clear match the 44px smart field;
icon-only controls have a square target. Filter chips remain below the row.
This local styling preserves the member/support backend owner scope, admin
arbitrary-owner selection, admin My-view scope, URL normalization, parser,
copy and clear behavior. It adds no navigation variant, API field or write.
See [scope and verification](../work-log/2026-11-07-todo-oom-filter-rhythm.md)
and REQ-010 / REQ-073.

## Monitoring filter dimensions (approved TODO UX-03)

Help, ordering, advanced filters, copy and clear match the smart field at44px.
This local styling preserves owner scope, ordering/cursor semantics, URL state,
copy and clear. See [scope](../work-log/2026-11-07-todo-monitoring-filter-rhythm.md)
and REQ-010 / REQ-073.

### Action state list dimensions (UX-03, 2026-11-07)

The filter toolbar uses matching 44px controls for search, help, visibility,
ordering, advanced filters, refresh, copy and clear. Visibility, errors and
text filtering remain local; server requests retain ordering and keyset scope.
Clear retains order. No permission, cancellation or mutation contract changes.

### Remaining list filter dimensions (UX-03, 2026-11-07)

Keep each filter action at its local reference field height: smart searches
44px, compact finance/template fields36px, coarse-pointer controls at least44px.
The standalone DNS-resolver action group uses36px on desktop. Keep existing
help/advanced dialogs, search tokens, owner/query scopes, refresh/copy/clear,
view toggles and create actions. This does not change any DNS/API behavior.

### Account control presentation follow-up (2026-11-07)

Namespace/map list filters keep 44px adjacent controls. User-data actions match
the supported format selector at 36px on desktop with shared 44px touch targets;
unsupported search/help/advanced controls remain absent. Both wrap action groups
at narrow widths. Personal profile change requests keep
their action label on one readable line beside the explanatory text. Owner
scope, query normalization, confirmation and mutations retain their contracts.
See [verification scope](../work-log/2026-11-07-todo-profile-control-rhythm.md).

The host-address, assignment-audit and live-network filter rows also match
the existing 44px VPS lookup, retaining their supported VPS queries and Clear.

### Shared keyset pagination control dimensions

Approved UX-03: navigation, jump and limit controls use matching36px desktop
height and the existing44px coarse-pointer minimum. Numeric page targets wrap
with the row. Cursor stacks, progressive counts, clamping, pending state and
owner-bound requests retain their contracts; this is a presentation correction.

The native UID/GID/both choice in namespace map entry forms uses the same44px
coarse-pointer minimum and font as adjacent shared fields. Desktop remains36px;
choice values, draft state, map creation/save/delete and ownership are unchanged.


### DNS server filter alignment (REQ-010)

Use the shared wrapping FilterBar child layout for the DNS server search and labelled selectors. Align controls along their bottom edge on desktop; stack the search before wrapping selectors/actions at narrow widths. Keep search/visibility/zone filtering local and preserve pagination and API query contracts. This presentation change does not alter DNS writes or authorization.

### Affected-outage read failures (REQ-010)

Administrator and support outage-detail cards keep user, VPS and export read
failures inside the affected section. Each failure uses the existing danger
alert with the localized Error/Chyba title and readable body text. The message
and requests retain their original source; other cards remain independently
available. This presentation change adds no retry, role, query or write behavior.


## Personal server membership retry

The existing All servers / With my VPS selector retains its current authenticated membership and retry flow. A read failure exposes an adjacent retry matching the field height. This presentation correction does not change request ownership, pagination, state persistence or admin selector absence. [Scope and verification](../work-log/2026-11-10-dashboard-own-scope-retry-alignment.md).

## VPS operation list wording (DET-02 result revision)

Show operations / Zobrazit operace opens the existing grouped VPS operation
list. Its title and group descriptions use the same wording. Find on page can
locate rendered operation names; opening the list or an operation link does not
submit it. The shortcut preserves its pathname and selected-user search, adding an explicit
#vps-operations fragment to focus and show the list below the sticky header.
Ordinary lifecycle URLs, all operation/form targets, role gates and confirmations
stay unchanged. Browser Back to the shortcut fragment shows the list again.
[Prepared correction](../work-log/2026-11-11-vps-operation-list-context.md);
original result changes remain recorded pending a separately verified delivery.


## Created snapshot download feedback (BAK-09/10)

The snapshot shortcut keeps the exact archive request with send_mail true.
Its result modal describes the returned download state once; a ready URL remains
usable, failed replies retain backend details, and expired/missing/unknown states
use a neutral title instead of saying preparation continues. Pending receipt
metadata permits a short Tasks hint. It does not create a task when no receipt
exists or certify email delivery. The existing progress popover, background
continuation, Tasks inspection and completion/failure notifications are retained.
The creation result describes the initial reply; progress is observed in Tasks.
[Scope and verification](../work-log/2026-11-11-backup-download-feedback.md).


Backup Center keyboard returns also preserve explicit destination focus claimed
before the deferred route-focus frame. This protects immediate Enter activation
while ordinary main-content focus, fragment navigation and scroll rules remain.
The BAK-05 [corrective verification](../work-log/2026-11-11-backup-detail-navigation.md)
records the original hosted failure and deterministic scheduling regression;
prepared source does not certify a deployed release.


### Shared snapshot-download presentation (BAK-13, prepared)

The Backup Center and dataset downloads use one responsive presenter. Snapshot
identity includes the complete filename and snapshot reference; format and size,
state and its explanation, expiration, and the action region keep the same order
in both views. Mobile groups are labelled and long unbroken values wrap. The
Center adds dataset context and its existing detail link; dataset detail keeps
its existing pagination, create/delete gates, busy checks, confirmation, and
retry draft callbacks. Safe download links and copying are client operations;
no Center mutation capability or new API request is inferred from presentation.
Loading, error, empty and selected-owner/request contracts remain with callers.
Fixture evidence and exact release status belong in the dated work log.


## Exit action semantics (UX-07)

REQ-010, REQ-020, REQ-048: Cancel abandons an unfinished action, Back navigates
from viewing, and Close dismisses a viewing overlay. A destination-named link
is valid navigation. The rule preserves existing dirty/pending guards and does
not create a new unsaved-changes requirement.

The audited NAS standalone header/footer Cancel links target the NAS list and
discard the unsubmitted draft. Child creation Cancel/Escape/backdrop keep the
dataset route, reset the draft and restore opener focus. Console size controls
change only the view; Overview targets the VPS overview. Cancelling session
replacement sends neither another token create nor a delete. These are fixture
observations on clean C9, not live lifecycle or permission certification. See
[the finite audit record](../work-log/2026-11-12-exit-action-rule.md).

### Export dataset selection

The global create dialog offers the currently authorized datasets by complete
name in the shared keyboard/touch combobox. Names and internal IDs are distinct:
a numeric name is still a name, and only an explicit `#ID` requests direct lookup.
Typing a different name or selecting another dataset clears the old snapshot.
The existing dataset/snapshot source payload and fixed snapshot shortcut remain.
The snapshot list retains its existing bound and exact preselected snapshot.

Member/support choices are filtered to the current account. Administrator My
view explicitly scopes Dataset#index to its own user and rejects foreign rows;
global administrators retain their authorized scope. Preserve Dataset#show and
the fresh My-view ownership read immediately before Create. Listing options is
not a grant of mutation permission. Loading/error lists hide stale choices and
support retry. A bounded or incomplete list offers the existing exact-ID/detail
entrypoints rather than claiming a complete sorted numeric cursor traversal.
Creation disables the dataset picker while its captured request is pending.
See [EXP-01 scope and evidence](../work-log/2026-11-15-export-dataset-selection.md).

Snapshot selection distinguishes loading, failure/retry and verified empty data.
The existing first100 bound is disclosed when count metadata is absent or partial;
users can choose another snapshot on the existing dataset-scoped snapshot page
and return through its exact-source export shortcut. Administrator My/member
links stay in the user view; global administrator links stay in administrator
view. Keep the existing initial snapshot even outside that first page. Late
responses for a previously selected dataset cannot replace the current list.


### NFS export documentation context

Create/edit/host options and read-only export detail link to the published
exports(5) server-options manual. The compact explanation identifies write access,
write acknowledgments, subtree checks and mapping of client root; vpsAdmin-only
flags and current form defaults remain distinct. Links open safely in a new tab
with a readable semantic foreground and an accessible announcement.

The persistent NixOS mount example explains that vpsAdminOS supplies container
rootfs from the host and that the snippet adds an NFS mount inside the VPS.
The note stays beside that example, not in temporary snapshot command-only
guidance. All example bytes, existing controls, source fields and write gates
remain unchanged. See [approved EXP-03 evidence](../work-log/2026-11-15-export-nfs-help.md).

### Bound DNS record columns and preserve complete names (REQ-049)

Use one fixed shared column grid with the standard minimum table width and local horizontal scrolling. Wrap complete record names and content within cells and mobile cards; keep row actions reachable and preserve managed/busy/role contracts.
[Scope and evidence](../work-log/2026-11-15-dns-grid-review.md).

### Show known inherited DNS record TTL (REQ-049)

Distinguish explicit record TTL, null inheritance from the current validated zone default, and missing/invalid unknown values. Show the known default in blank-field help without filling the draft. Preserve omitted TTL on Create and null on Update when clearing an override; no query, mutation, validation or lock changes.
[Scope and evidence](../work-log/2026-11-15-dns-ttl-review.md).

### Explain DNSSEC record purpose concisely (REQ-049)

Use a shorter introduction identifying the zone DNSKEY and DS for the parent zone. Keep full record text, clipboard values, requests and primary/secondary/error/empty handling unchanged. RFC4034 section5 supports the parent-zone distinction; this is not DNS publication or signing-status verification.
[Scope and evidence](../work-log/2026-11-15-dns-dnssec-review.md).

## Approved account follow-up: ACC-07

Name the known-device search with its visible label and associate its always-visible help. Explain that filtering covers the current page, local changes refresh automatically and Refresh loads changes made elsewhere. Preserve owner scope, cursor recovery, polling intervals, device mutation confirmation and query invalidation.
Migration acceptance receipts distinguish immediate work from maintenance-window or
custom scheduled completion using the captured submitted payload. Acceptance is
not completion; preparation can begin before the window. The user may leave and
track Tasks, while duplicate-operation and uncertain-request locks remain intact.
