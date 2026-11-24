# Complete accepted integration CI without losing test coverage — 2026-11-24

The first [integration334 browser run](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/45495168867) exceeded the existing40-minute
job limit. Its unchanged project selections contained1433desktop,1376mobile
Chrome and1051mobile WebKit cases, each with two workers. All three original
job logs/annotations are retained in the operational receipt; the three
nonbrowser/build/script jobs passed. No merge occurred after these failed checks.

The logs also identify stale setup in the existing NFS-options regression.
It filled bare `20` as a direct ID after the accepted dataset picker changed
bare text into a name search. Provide the owned dataset list and choose its
visible `archive` option. Keep all original enabled-state, CS/EN/theme/role,
NFS flag, rejected-draft, exact POST payload and overflow assertions. No product
ownership/selection guard is changed.

Partition every existing browser project into three file shards using
[Playwright's documented sharding](https://playwright.dev/docs/test-sharding).
Keep two workers per shard, the same40-minute limit, normal retries, complete
project selectors and failure artifacts. Give reports/traces unique project and
shard names. Preserve the existing required per-project check names as success
gates that require all nine shards to pass. No fail-fast, skipped tests,
continue-on-error, relaxed assertion or increased budget is introduced.
File sharding retains existing in-file ordering; fullyParallel is not changed.

Relevant requirements: REQ-061, REQ-062, REQ-063 and REQ-064.

Prepared qualification requires the complete quick/script/BFF/unit/build suites
on the final clean focused head, dry-run equality of each unsharded test-ID set
with its three-shard union (no omissions/duplicates), and the unchanged NFS
regression against the native artifact in all three engines. Existing235desktop
and24mobile artifact cases remain evidence for the byte-identical product source
at the first candidate; source equivalence must be recorded explicitly, not
misrepresented as a browser run of another artifact. Actual final-head and
postmerge GitHub checks must pass before completion. No preview/API/production
activation or prohibited builder access is used.


### Capacity regression follows accepted mobile identity

The second integration CI retained six successful project shards, but each
second shard timed out while retrying the same outdated NAS capacity link
assertion. The accepted NAS identity change already labels mobile links
`Dataset name: 318` / `Název datasetu: 318`, while desktop links remain `318`.
The capacity regression now checks those exact existing accessible names by
viewport and language, retaining the exact role, destination, every capacity
percentage/limit/color, all actor/language/theme combinations, overflow and
no-write/runtime-error assertions. No product label or runtime changes here.
Original failed jobs and traces remain evidence; no retry/time budget changed.
This is separate from the genuine host-filter navigation race fixed and
regression-tested in the accompanying work-log entry.
