# Restore API operation names in transaction headings

Date: 2026-10-03. Requirement: REQ-051.
Status: prepared for review; not merged or deployed.

The maintainer reported transaction rows headed “Operace” with their actual
names relegated to “Backend name”. The API already supplied the names. The
shared operation-label helper preferred a small client-side English heuristic
catalog, even for unknown/localized operations; the chain table also rewrote
common names independently. Neither should override the authoritative API name.

Prefer the trimmed API label/name in the shared helper, then use the existing
localized fallback only if it is missing. Remove the chain table's separate
name rewriting. Preserve category/severity/visibility classification, status,
progress, concerns, links, pins, filtering and polling. Existing renderers omit
the redundant backend-name line when it equals the primary title. This covers
chain rows/Tasks and transaction item headings using the helper; chain detail
already displayed the API label. Explicit labels recorded at submission remain
available for locally tracked actions.

Localization reference: locked vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The previously resolved terminology
and localization guides require API transaction labels to remain authoritative.
No new UI translation map or catalog strings are introduced. Labels remain React
text, including unfamiliar names, rather than HTML.

All 24 focused browser cases passed in Chromium desktop and mobile, covering
transaction chains, chain details and transaction details. The new naming cases
ran with both Czech and English fixtures. Reviewed implemented screenshots:
[desktop](screenshots/2026-10-03-transactions/desktop-cs.png) and
[mobile](screenshots/2026-10-03-transactions/mobile-cs.png).
All local PR gate stages passed in the locked Nix Node 24.21.0/npm 11.19.0
shell: audits, lint/format, app/tooling/E2E/BFF types, 222 script tests, 57 BFF
tests, all 1,656 unit tests (281 files), and the production build. Root dependencies
were installed with `npm ci` in an isolated build directory; unchanged BFF
dependencies were reused after comparing lockfiles. No deployed directory changed.

Commands: `npm run ci:pr`; after updating the action-state detail regression to
assert the primary heading instead of an ambiguous text match, reran
`npm test -- --run` and `npm run build`. The first implementation's explanatory
comment exceeded the existing helper file's structural budget; the final concise
helper passes without any budget or exception changes. Also ran
`npm run audit:design-docs` after adding screenshot evidence.

Browser command: `node scripts/playwright.mjs test
e2e/specs/app/transaction_chains_ux.spec.ts
e2e/specs/app/transaction_chain_detail_page.spec.ts
e2e/specs/app/transaction_detail_page.spec.ts
--project=chromium --project=mobile-chrome --workers=2 --reporter=line`. Unit regressions cover Czech/English unknown and recognized
operations, payment concern misclassification, whitespace and missing labels.
Browser fixtures cover the primary link, missing duplicate backend caption,
chain detail, Tasks and overflow on desktop/mobile. Synthetic screenshots only;
the supplied private screenshot is not committed. Browser fixtures do not prove
live API behavior. The existing browser spec is adopted into strict E2E types.

KB scope: no navigation IDs/routes or PHP labels change. Existing external KB
transaction prose describes the legacy PHP interface; these React captures do
not certify those external pages. No KB publication or deployment is included.

## Deployment follow-up — 2026-10-03

Merged and deployed to all three WebUI sites in clean release `f123a7fb`.
See the [completed release receipt](2026-10-03-three-site-release.md) for
exact provenance, CI results, runtime verification, rollback and limitations.
