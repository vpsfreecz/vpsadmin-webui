# Dashboard owned-server identity and admin scope — 2026-11-08

REQ-054. The maintainer reported the With my VPS lookup failing in My view and requested removing that choice from the administrator view. Fresh real anonymous status responses from the dev API (four rows) and production API (13 rows) contain no node IDs. The deployed backend PublicStatus action intentionally blacklists id for anonymous callers. The dashboard incorrectly used the anonymous client and then required those missing IDs to join owned VPS. Previous fixtures always supplied IDs, hiding the regression.

The authenticated dashboard now uses the generated authenticated PublicStatus operation and validates positive node IDs. The anonymous public overview retains its anonymous executor and never acquires private authorization headers. Dashboard status caching is distinct and bound to the signed-in account. No names/FQDN guesses, fabricated IDs, backend/schema/SDK change or public identity disclosure are introduced.

Member and support own-VPS queries rely on the API's enforced current owner and do not send the administrator-only owner filter. Global administrators in My view send their exact signed-in owner ID. Every returned VPS owner, stable node ID, ascending cursor and bounded full collection remain validated. Empty, loading, network/missing/foreign-node failures and explicit retry remain separate.

Administrator and support admin views ignore a saved personal mine scope, show the complete cluster and render no scope selector/retry control for it. They do not overwrite the saved My-view choice. Switching back applies that personal choice again. Cases cover app/admin, member/support/global admin, cs/en, light/dark, reload, foreign URL user context, later pages, stopped VPS and unavailable membership/status identities.

Terminology: locked vpsadmin input a65a4dfeb92a59df4a80a737a20bcbf8558793ff; no new UI wording/catalog keys. KB impact review targets the separate legacy PHP contract, which has no registered React dashboard own-server selector. No invalid React SHA is put into its backend input; external KB captures and real OAuth are not certified by fixtures.

Prepared fix. Focused adapter/membership18 tests, source ci:quick (including localization/design/type checks), all2351 unit tests and production build pass. Real isolated dev API checks with three fresh disposable admin/member/support identities pass: four authenticated stable node IDs, empty own collections, member/support foreign-filter isolation, and a read-only positive join of eight existing dev VPS on two nodes. Anonymous IDs are absent as expected. No VPS or existing user was changed. The prior release reproduces both defects in all three browser projects (six baseline checks). Browser regression, real OAuth, immutable artifact and paired preview acceptance/deployment outcomes are recorded separately after execution. Production64c/gen26/config1072 is unchanged; this request authorizes the fix/dev validation and existing paired preview procedure, not a new production switch or merge. Original failures and before/after evidence are retained.

The initial published head28d92503 failed Required nonbrowser checks because the script-level HaveAPI request double lacked the real Playwright headers method added by the regression fixture. The double now supplies request headers and the router contract asserts their preservation. All244 script tests and58 BFF tests pass after installing the separate pinned BFF dependencies. The first local script attempt lacked those dependencies and is retained separately; no product/dependency change or test weakening was used. The original source75 browser checks passed; the clean preview package repeats them. Final artifact provenance and paired deployment are recorded after the test-only follow-up.

On 2026-11-09 the existing draft was synchronized with current main to preserve
the account controls and contextual help. The isolated dev API was verified
with a newly created, stopped VPS owned by a regular member. The anonymous
node action returned four servers without IDs, while the authenticated action
returned IDs that matched the owned VPS. The member's exact owner and node
came from the real API, with no name-based fallback.
