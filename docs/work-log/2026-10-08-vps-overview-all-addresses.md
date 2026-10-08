# VPS overview: show every loaded IP address (2026-10-08)

Status: prepared for review; not merged or deployed. REQ-016, REQ-050.

The Network card selected at most three addresses (preferring one per address
family/scope) and replaced the rest with a count. This hid an assigned address
in the reported four-address VPS. Render every returned address in API order,
with the existing scope badge and copy button. Wrap long IPv6 values instead
of truncating them, preserving the complete address and prefix when copied.
Remove the obsolete preview selector and its three-address unit expectation.

No API/BFF or address-query behavior changes. The existing shared VPS query
still requests up to 250 addresses; this change removes the card's three-row
presentation limit, not the query's existing pagination limit. Empty, loading
and failed-query states remain available. No UI wording or catalogs changed.
The locked terminology guide was reviewed at vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Verification

- Reproduced against the deployed dev.crucio.cz frontend in mobile WebKit:
  six synthetic addresses returned, only three list rows displayed.
- New regression covers six IPv4/private/IPv6 addresses, including a long IPv6,
  in Czech/English and member/admin views. It checks API order, full text,
  copy content (single taps on mobile), and horizontal overflow.
- The new spec is in strict E2E type coverage and the mobile WebKit project.
- Candidate checks: 12/12 passed across desktop Chromium, mobile Chrome and
  mobile WebKit (four role/language combinations per project). Synthetic
  desktop/mobile captures were reviewed; all six rows and long IPv6 are visible.
- Pinned Nix Node 24.21.0: `npm run ci:quick`, `npm test -- --maxWorkers=4`
  (1,718 tests / 289 files), `npm run build`, and the 16 E2E type-coverage
  script tests passed. Build retains its existing large-chunk warning.
- Chromium ran on Linux; WebKit ran in the isolated macOS harness with the
  lockfile's Playwright 1.61.0 and bundled Node 24.19.0. The candidate build
  and source validation used the Nix toolchain.

Browser checks use synthetic session/API fixtures. Candidate HTML/assets are
served inside the test browser on the dev.crucio.cz origin; this does not
change the deployed service or certify real API behavior. Screenshots contain
only synthetic data. External KB screenshots have not been recaptured.
