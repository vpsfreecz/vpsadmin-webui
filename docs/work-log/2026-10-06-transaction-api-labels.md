# Use API transaction labels in the selected UI language

Date: 2026-10-06. Requirement: REQ-051.
Status: prepared for review; not merged or deployed.

The maintainer requested that transaction names use existing API translations
when the UI is Czech, while respecting English UI selection. The earlier PR11
fixed chain titles but individual items still read technical `name`; requests
also inherited browser/API language rather than explicitly selecting UI language.

Declare and consume transaction `label` in the shared taxonomy and all direct
item renderers (lists, detail, chain steps, action-state steps and Tasks).
Keep technical names for classification/diagnostics and older-API fallback.
HaveAPI calls send the resolved document/UI language in `Accept-Language`.
The document language is committed before query effects; language changes cancel
old reads and invalidate query caches without unmounting editors or replaying
mutations. OAuth read retries retain the original request language.

Localization guides were read from the Nix-resolved vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Source inspection confirms the API
header negotiation, transaction `label`, and existing cs/en catalogs. No API,
BFF, catalog, mail preference, account data or deployment change is included.

## Verification

Using locked Nix Node 24.21.0/npm 11.19.0 in an isolated source directory:

- All 1,710 unit tests passed (285 files), including label/name fallback,
  cs/en request headers and OAuth retry, cancellation of a delayed old-language
  response, invalidation of inactive cache, editor identity and no write replay.
- All 226 script tests passed; production build passed (existing locale-chunk
  size warnings remain).
- All 28 Chromium desktop/mobile browser cases passed across transaction item
  detail, chain detail and chain UX specs. New cases select API responses from
  the actual Accept-Language header and cover list, chain steps, Tasks, detail,
  and cs-to-en/en-to-cs switching without reloading the page.
- `npm run ci:quick` passed (audits, lint, format and all typecheck scopes). Regenerated API
  inventory has no drift. Adopted the edited E2E file into strict types and the
  locale bridge/provider into scoped lint. Reviewed the two existing structural
  debt exceptions for the two-line request-header addition and one-line chain
  helper import; retained their extraction obligations.
- Production frontend dependency audit passed. BFF dependency audit still fails
  for the inherited proxy-addr advisory GHSA-jqcg-44mw-7w3h, addressed separately
  by PR20. Dependencies and BFF behavior are unchanged by this PR.

Commands: `npm run ci:quick`; `npm test -- --maxWorkers=4`;
`npm run test:scripts`; `npm run build`; `node scripts/playwright.mjs test`
with `transaction_detail_page.spec.ts`, `transaction_chain_detail_page.spec.ts`
and `transaction_chains_ux.spec.ts`, `--project=chromium --project=mobile-chrome
--workers=2 --reporter=line`. Fixture server listened only on loopback in the
isolated test directory and was stopped by Playwright.

Browser evidence is synthetic, not live API certification. Implemented
captures: [desktop cs](assets/transaction-api-labels-20261006/chromium-cs.png),
[mobile cs](assets/transaction-api-labels-20261006/mobile-chrome-cs.png),
[desktop en](assets/transaction-api-labels-20261006/chromium-en.png),
[mobile en](assets/transaction-api-labels-20261006/mobile-chrome-en.png).
No external KB pages or legacy PHP routes are changed; these React fixture
captures do not certify external KB screenshots.
