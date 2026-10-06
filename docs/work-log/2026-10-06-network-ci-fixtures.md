# Network CI fixtures follow the existing API contract

Prepared, not merged or deployed. Requirement: REQ-050.

The CI audit found two failures in the full nightly suite
[37448981784](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37448981784).
Both are outdated fixtures, not evidence of broken production filtering:

- Clear-filter mock returned descending IDs for an ascending request. The
  validated collector correctly rejected that page, showing partial data.
- Host IP test used legacy `q`, which intentionally resets with an explanation.
  The supported exact-address filter is `addr`, documented in API_CONTRACTS.md.

Use a small ascending response and assert that clearing removes the address
from both URL and outgoing API request, loads the expected row and clears the
empty/partial states. Exercise the host IP filter through the UI and return
only exact matching fixture rows. Assert `addr`, `order=asc`, absence of `q`,
nonmatching row removal and retain assignment/audit and responsive checks.
Promote both regressions into desktop/mobile PR and broad smoke gates. Adopt
the two full specs into strict TypeScript coverage (36 adopted, 214 deferred).

Strict E2E type checking and its 16 coverage-gate tests pass. Desktop cases
and host-IP mobile case pass; clear-filter mobile assertions target the actual
card layout instead of the hidden desktop row. Final regression/CI results follow. No runtime, API or deployment changes.
