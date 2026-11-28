# VPS issues

Memory pressure is an issue type in the VPS issues view. It shows qualified
recorded time during slow host responses and is separate from incident-policy
counts and decisions. It does not measure every pressure episode or establish
which VPS caused a slowdown.

## Current period

The overview has one row per VPS and signal with positive recorded time. The VPS
page also displays signals with no current contribution. Both use the normal
responsive table and mobile-card layout. Recorded time, period and reporting
threshold are primary facts. The table has no observation-state column or read
timestamp. A scoped VPS link opens the dedicated full-width detail page.

The meter compares recorded microseconds with the reporting threshold in
seconds. Its visual value stops at 100 percent, while accessible text retains
the exact duration, threshold and period. The meter is orange below 80 percent
and red at or above 80 percent; color does not replace its numeric value.
Reaching the threshold does not promise an incident or enforcement action.
Reporting can be disabled independently. Unavailable values, recorded zero,
subsecond values and no observations remain distinct. Zero with no observations
has no meter. An invalid threshold has no meter.

User ID, VPS ID, node, location and environment are server-side filters, exposed
only when authenticated API discovery supports them. Applying filters resets the
offset; pagination retains them. An unsupported or invalid supplied filter
cannot silently broaden the query. Placement filters describe current placement.
The overview is available at `/app/pressure` and `/admin/pressure`; VPS detail
uses `/app/vps/:vpsId/pressure` or its administrator counterpart. The normal
sidebar and a capability-gated VPS tab lead to these routes.

Administrator view may show owner and node links. My view stays scoped to the
authenticated account, including when that account has administrator privileges.
Hiding privileged links does not replace scoping the API request. The existing
VPS route guards still apply to direct links.

## Daily history

History offers the last 7 or 30 UTC daily buckets, including the current bucket.
It reads compact daily totals for the VPS's current owner and accounting epoch.
Each row shows its actual start and exclusive end in the account timezone, using
readable localized dates and times. Endpoint offsets distinguish daylight saving
changes; the selected zone appears once beside the table. The UTC buckets keep
their original boundaries and totals, even when a boundary falls on a different
local date. The current bucket is labelled In progress. Unknown days show No
recorded data; they are not measured zero. Daily totals are not compared with
today's rolling reporting threshold.

The history operation returns exactly 7 or 30 ascending calendar buckets. Every
bucket ends at the next UTC midnight, including today; the captured read time
does not clip that boundary. Today's partial marker does not make other days
complete observations. The total sums only the returned positive contributions
and is null when none are recorded. The optional first retained recording is the
earliest stored acceptance time across the retained days, independently of the
selected range. It can move after pruning and is not a first occurrence or a
coverage boundary. Current freshness or reporting configuration does not
determine historical availability.

The backend records only new accepted contributions after the daily writer is
active and retains 32 UTC days. It does not reconstruct history from old live
intervals, incident snapshots or mail. Mixed writers and software rollback can
leave unknown days. Existing incident history remains a separate link.

## Compatibility and verification

The consumer uses the generated SDK and existing authenticated transport.
Authenticated discovery gates each operation and optional filter. Missing
history does not prevent supported current-period reads. Static generated types
do not establish permission or availability, and Custom metadata still needs
runtime narrowing. The final dependency must be a published SDK registry
artifact before merge; a development candidate is not a release prerequisite
waiver.

Focused tests cover null/zero and subsecond values, meter boundaries and exact
accessible text, roles, default and unchanged filter submissions, pagination,
account/server timezone selection, DST endpoints and missing days. Desktop and
mobile browser fixtures establish rendering and interaction only. Real API
authorization, writer behavior and deployed source require separate evidence.
The React repository adds no database migration or persistent backend state.
