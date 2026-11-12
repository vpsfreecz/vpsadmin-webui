# Backup statistics open their counted records — 2026-11-12

Approved BAK-03 `82e625114b309844`, REQ-048/047. Existing overview cards were
inert. A finite clean EBEB fixture audit confirms that the dataset picker and
Downloads tab contain the same complete account-scoped IDs counted by the first
two statistics. Native card links clear local query/selection/restore/cursor
state and preserve unrelated parameters and the route. Other tabs retain their
filter-preservation contract. Lifecycle groups have no exact existing target;
leave them inert. Incomplete/error counts do not imply a complete destination.

The focused base retains its existing StatCard layout; the cumulative preview
retains its already reviewed compact layout. Both use the same local optional
link wrapper. Global cards, API calls, role gates, locales and dependencies are
unchanged. No new backend or SDK support is required.

Verification is in progress. Clean current-preview baseline: 12 fixture cases
across Chromium desktop and 320px Linux WebKit, CS dark/EN light and member,
administrator My and support My. Exact IDs and owner/query contracts pass with
zero retries, page errors or writes. Synthetic before screenshots are retained.
Dirty cumulative28 and focused28 fixture configurations all pass with zero
retries, errors or writes; these repeat the same28 configurations, not56 unique.
Partial/error/empty data, exact IDs, keyboard/URL/reload/Back and scope contracts
are covered. Existing31 model/page/collection tests, pinned ci:quick and production
build pass in both sources. CI, clean immutable packaging and paired previews
remain pending. No merge, approval, live mutation or delivery is claimed.

The focused foundation also adopts the exact already reviewed pinned PR browser
image from the delivered preview. This avoids the recorded system-package mirror
setup failure; it preserves all six checks, projects, timeouts and assertions.
The cumulative source already contains that verification prerequisite.
