# Global search before visiting lists — 2026-09-30

## Request and diagnosis

The maintainer reported missing IP and DNS matches which appeared after browsing
lists. Public `newadmin.vpsfree.cz/build-info.json` identified main revision
`534caa83a5f97d2b40b4a126886649b14dc9e8d3`. No production account data was used.
The header does not read visited-list React Query caches. Three independently
reproducible defects were found: direct-owner IP filtering excludes VPS-assigned
addresses in an administrator's My view; the admin header discarded every hit
after eight; a failed DNS/IP lookup could become an empty successful search.
The original incident's exact mode and network trace remain unknown.

## Changes and boundaries

- Exact IP lookup verifies direct or assigned-VPS ownership after querying, and
  traverses supported admin ID pages before presentation limits. It never loads
  the global IP inventory. Member composite ordering is not guessed.
- Keep all navigable cluster hits in a scrolling header list; keyboard selection
  stays visible. Preserve existing API order, links and deduplication.
- Show failed empty searches as errors; retry failed DNS scans on a new query.
- Record REQ-070 and the search workflow. Use a per-change work-log file to avoid
  another central mutable status record; the root log links to this entry.

API ordering/filter inspection used locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Its localization guide was read;
the incomplete-IP diagnostic has matching English/Czech text. No API/BFF/authorization changes,
production mutations, merge or deployment are included.

## Verification

Passed with the already resolved pinned Node 24.21.0 runtime:

- 20 targeted search unit cases (IPv4/IPv6, direct vs assigned ownership,
  multi-page admin results/end, member-order guard, unknown owner, errors/retry).
- 14 targeted browser fixtures: cs/en administrative results, member/admin My
  view, second-page DNS before any list visit, reload, API error/retry; desktop
  header and mobile palette, plus the localized incomplete-IP diagnostic.
- 18 adjacent browser fixtures: original global search and command-palette
  behavior, cancellation/stale responses, scope, keyboard/focus and IP links.
- 16 E2E coverage-gate tests; the new browser spec is strictly typed.
- `ci:quick` audits, lint, localization, app/tooling/E2E/BFF-core typechecks and
  production build. No declared commit-hook framework was found.

An initial fixture expected a non-existent “Search failed” label and attempted
the hidden desktop input on mobile. Corrected it to the real translated error
prefix and the mobile palette; no checks were skipped. The final ordering guard
uses the actual admin role, not the ability to switch UI modes. Supplemental
user-detail enrichment remains bounded to the first eight header hits.

Fixtures use synthetic accounts and example-domain/IP values, not live
certification. [Czech DNS result](screenshots/global-search-dns-cs.png) and
[owned VPS IP result](screenshots/global-search-owned-ip.png) are committed
screenshots. PR review is next; no merge or deployment performed. External KB captures have not been regenerated; navigation
labels/routes are unchanged and only search-result content/scrolling changes.

### CI follow-up

The full GitHub unit suite exposed two AppHeader failures: JSDOM does not
implement `scrollIntoView`, which the active search result now uses. Added a
suite-local scrolling mock with restoration and asserted that keyboard selection
scrolls the newly active option. No production guard or test skipping was added.
The complete unit suite then passed: 1,637 tests in 280 files. Browser behavior
and earlier browser evidence are unchanged; CI reruns on the updated PR head.

## Deployment follow-up (recorded 2026-10-02)

[PR #5](https://github.com/vpsfreecz/vpsadmin-webui/pull/5) was merged
on 2026-09-30 and deployed in `718cf7596eb8b11a796268a73c1f2e0a02a98450`
to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. See the
[release receipt](2026-09-30-three-site-release.md) for exact CI and deployment
evidence. The earlier prepared status is historical; fixture checks are still
distinct from authenticated live workflow certification.
