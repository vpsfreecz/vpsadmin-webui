# Full browser contract repair before release integration — 2026-11-26

Requirements: REQ-046, REQ-061, REQ-062, REQ-063, REQ-064, REQ-068.

Current main `e311b1c0af0f50fa4c6f6ce83c514c1a866eb042` passed its merge checks,
but its two subsequent full Chromium Nightly runs failed the same 47 cases.
The original logs and HTML report from
[run 45821081131](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/45821081131)
were retained before diagnosis. A green PR selection cannot certify the full suite.

## Contract and behavior corrections

The published SDK remains `vpsadmin-typescript-client@0.6.0` and HaveAPI remains
`0.32.0`; the production transport and its fail-closed output validation are unchanged.
Fixtures now return the generated response namespaces: `clusters` for cluster
search, `nodes` for public node status, `dataset` for dataset detail, and explicit
nullable resource members for successful deletes. Root-level `response: null`
is not equivalent to `response: { news_log: null }`. Actual-package XHR tests
cover both the accepted delete response and rejected omitted namespaces.
Public node rows include required numeric identities, names and boolean status;
node maintenance lock uses its actual nullable string representation.

Lifecycle fixtures distinguish explicitly unset dates (`null`) from absent,
unknown date fields. The production guard still refuses to submit unknown
lifecycle data. User creation asserts the complete supported request rather than
expecting the unsupported `monthly_payment` field. Translation-create fixtures
return the expanded language relation instead of overwriting it with the numeric
request input. User networking fixtures resolve incomplete assignment relations
through the current, owned-VPS allocation query and assert that exact scope;
foreign allocations remain excluded.

Transaction coverage asserts automatic contextual expansion, then explicitly
collapses and reopens the step before checking the original administrator links.
VPS-list navigation asserts the exact pathname and canonical page/limit parameters.
Recent OOM coverage distinguishes the bounded recent-warning query (one record,
with `since`) from the overview history query (three records, without `since`).
Both request shapes and the original report/empty/error UI remain asserted.

The network-purpose scenario also exposed a product defect: mirrored local filters
and URL effects raced with keyset pagination, losing changes or causing repeated
renders. Network filters now have one source of truth in the URL. A filter update
atomically preserves unrelated parameters and resets the cursor; combined smart
filters update together. Regression coverage exercises an advanced purpose change
from a paginated URL and browser history restoration of both location and purpose.

## Verification and boundaries

The initial reproduction retained all 47 original case titles and assertions.
The first fixture pass produced 32 passes and 15 failures with two workers, zero
retries and no skips. The new filter regression on unchanged product source
entered a synchronous render loop; its worker was terminated after retaining
the original log. Subsequent qualification results are appended below.

Local browser diagnosis serves the actual candidate source through the existing
pinned Playwright 1.61.0 runner. Synthetic API routes intercept requests and an
outer guard blocks unmatched API/external origins. These fixtures do not certify
a real backend or authenticated production workflows. No assertions, gates,
budgets or existing retry policies are weakened; no new skips are introduced.
No dependency, backend, production pin, production service or builder is changed.
The running preview remains unchanged until a separately qualified release.

The final original-failure rerun passed **47/47** Chromium cases with two workers,
zero retries, zero skips and no failures. Complete quick checks passed; all
244 script tests, 58 BFF tests and 2,566 unit tests in 378 files passed, and
the production frontend build passed. Twelve touched legacy browser specifications
were adopted into strict TypeScript coverage; all compiler flags and the original
deferred-source hashes remain protected. Product, unit, script and BFF input
hashes were retained and verified unchanged throughout that complete test run.

The complete browser run and hosted CI are separate pending gates on the frozen
commit. Full fixture verification uses the pinned rootless runner with an isolated
network namespace: loopback works and external routing returns `ENETUNREACH`.
The original specifications and imports run unchanged in that full verification;
no live backend is reachable. This is separate from later deployed dev acceptance.

## Existing PR281 and preserved history

The earlier [PR281](https://github.com/vpsfreecz/vpsadmin-webui/pull/281) already
covered the same 47 failures on an older main. Its original head and dated evidence
are retained through an ordinary merge; this work updates that existing PR.
The current repair retains every original scenario and strengthens exact create,
filter, ownership, OOM and expansion assertions against the present source.
The original PR's fixture intent is superseded by these current SDK-compatible
responses. No duplicate repair PR or rewritten published history is required.
