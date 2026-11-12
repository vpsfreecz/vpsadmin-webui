# Hide inactive snapshot pagination

Approved BAK-08/21b5b44ca530e084, REQ-044. Hide the pagination controls
when the first page already contains every snapshot. Keep controls and
page-size selection whenever a previous or next page exists. The extra
row probe, cursor, query keys and mutation behavior remain intact.

Page size remains a browsing preference. The UI does not infer snapshot
creation limits or retention from page size, returned rows or total count.
The existing keyset browser suite covers the complete first page and the
multi-page round trip.

Both source variants pass pinned quick checks, production builds, seven
focused unit cases and six keyset Playwright cases in desktop and mobile
Chromium. The Playwright suites use intercepted datasets.
