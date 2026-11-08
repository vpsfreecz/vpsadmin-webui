# Native field and pagination control dimensions

Approved UX-03 (7c773db80dfa673c), bounded presentation follow-up.

Exact8ca5 rendered account-device pagination has a36px jump field next to a32px
submit on desktop and44px submit on coarse mobile. Match navigation and submit
controls to36px and give the native jump field the shared44px coarse minimum.
Keep cursor stacks, numeric clamping, request limits, pending/disabled behavior,
role/owner policy and visible text unchanged. Page number targets match the row;
wrapping remains responsible for narrow layouts. No API/BFF/dependency changes.

The component is adopted into existing normal lint coverage. Browser regression
uses151 intercepted synthetic devices, visits seven cursor pages, jumps back to
an interior page, checks all controls, actual focus and320px containment, then
returns to page1 and changes the request limit. Both languages/themes and
Chromium/mobileWebKit are required. No live mutation or permission acceptance.

Prepared local source state only. Prior source8ca5 probe4 cases passed; new
source checks, browsers, clean outputs, CI and paired preview proof remain to
be recorded. Broad UX-03/04 remains partial; PR201/TODO publication continues
separately while the shared browser lease is occupied by the main audit.

## Related native field found during the same acceptance audit

The remaining raw36px map-entry kind select was rendered beside44px Input/Add
controls on coarse mobile. Match its minimum height and font to shared Input,
retaining36px desktop size and mapping semantics. Include this related compact
control fix in the same focused PR202; its prior6e412269/C8 candidate passed all
six CI checks but was never activated. Preserve those outputs/stages as history
and require a new exact-head six-check run and clean packages before promotion.

The new map regression selects GID, fills a local draft, measures native/shared
field sizes, checks keyboard and320px without submitting any mapping mutation.
The existing structural debt hash is rebound for this class-only change; line
allowance, owner, thresholds and removal condition do not grow.
