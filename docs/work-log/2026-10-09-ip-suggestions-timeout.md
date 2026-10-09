# Free-IP suggestion timeout

## Request and cause

[Issue30](https://github.com/vpsfreecz/vpsadmin-webui/issues/30) records a stalled
shared OPTIONS request that can keep administrator IP suggestions loading.
The existing 12-second suggestion timer covers the address transport, but its
query waits for shared capability discovery without observing that timer.
This change extends REQ-050's suggestion-loading contract.

## Accepted change

Each suggestion query keeps one 12-second budget across capability discovery
and the address request. A caller-local abort-aware wait settles on expiry or
cancellation and consumes late promise settlement. Checks before lookup, before
the address request and before returning rows prevent late work or publication.
Timeout uses an ordinary error so later locations can progress.

Shared capability discovery and its five-minute cache remain available to other
callers. Explicit retry starts a fresh budget and may rejoin a still-pending
shared lookup. It does not force that lookup to restart. Successful older-API
metadata still omits the unsupported availability filter; discovery errors are
not treated as older-API support or an empty pool. The server filter and local
disabled-row guard remain in place. Manual filters retain their separate list.

The query plan, limits, priorities and existing error/retry interface are
unchanged. This budget is per query; progressive loading of several locations
can take longer than 12 seconds. Assignment capability discovery is a separate
caller and is outside this fix.

## Verification and release state

The implementation and affected tests are being prepared on
`dev/ip-suggestions-timeout`, based on current main
`7152729dcde326e00d16b5af0a46d0f60b431dbb`. The planned tests use the real
QueryClient with fake time to cover shared metadata, late results, cancellation,
cache reuse, retries, progressive loading and manual-filter isolation. English
and Czech browser scenarios belong to the existing adopted network-availability
spec and select desktop and mobile smoke projects.

No checks or browser captures have run for this change. Exact committed-head
hosted checks, independent review and screenshot inspection are pending.
Synthetic browser fixtures will not certify a live API or deployment.
The separate legacy PHP KB screenshots and portable-runtime verification remain
pending in the [development session](https://vpsfree-cz.workspace.aitherdev.int.vpsfree.cz/2026-10-05-network-ipv4-left-counter/).
