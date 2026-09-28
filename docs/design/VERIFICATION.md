# Verification, readiness and release evidence

Requirements: REQ-039, 042–046, 056–065, 067–069. Documentation coverage, implemented code,
passing fixtures and production readiness are separate claims.

## Evidence levels

| Level | Proves | Does not prove |
| --- | --- | --- |
| Source inspection | Route/adapter/guard exists at a revision; request shape can be reviewed. | Deployed API accepts it or UI works in a browser. |
| Unit/script/BFF tests | Tested model, guard, serialization, server and script contracts. | End-to-end deployed workflow. |
| Fixture Playwright | Rendering, interaction, request expectations against synthetic intercepted responses. | Backend ordering, actual permissions/mutations or real DNS/restore outcomes. |
| Real isolated API/VM | Exact workflow against pinned backend with synthetic objects and receipts. | Every other workflow, another revision, or shared production state. |
| Anonymous deployed checks | Build provenance, public pages, endpoint routing, selected auth/health properties. | Logged-in member/admin lifecycle certification. |
| Human review/audit | Scoped UX/security/code conclusions with named reviewer and findings. | Unreviewed areas or permanent freedom from defects. |

Evidence records need date, commit/tree, API revision when relevant, environment,
command/scenario, role, locale, viewport, data origin, result, artifacts and limits.
For mutations include object ownership, acceptance/action-state IDs, final state
and cleanup receipt. Do not rerun completed destructive scenarios blindly.

## Repeatable checks

The application supports the Node range in [package.json](../../package.json).
Required checks select the exact `.node-version`/`.nvmrc` value, Node 24.21.0,
which is also supplied by the locked Nix development shell. Its bundled npm is
11.19.0. `env:locked` checks both values; CI no longer installs a different npm.
Before claiming a Nix-based result, record the effective versions and pinned
vpsAdmin source revision; site configuration can override that input at build
time.

The separate immutable [frontend and BFF packages](PACKAGING.md) require an
exact-source Nix build of both outputs and all three package checks: provenance,
cleaned source contents and installed package contents. The content check builds
both packages and compares their schema-1 metadata. Local Node checker fixtures
and Nix syntax checks cannot substitute for an offline dependency build, actual
source filtering or closure inspection. The disabled-by-default
[NixOS service module](NIXOS_SERVICE.md) has a build-free evaluation fixture
covering disabled, valid, invalid and legacy PHP coexistence cases. Inspect
its rendered service and nginx settings on the exact pinned input. The separate
`nixos-webui` VM check uses a fixture TLS edge, private backend, client and
HTTPS OAuth provider to exercise listener/forwarding trust, public routes,
response policies, login/session restart and synthetic legacy-state isolation.
Its passkey assertion checks the BFF's fixed response-specific CSP, which has
no nonce. Evaluation does not substitute for actually building and running
that VM test. Site deployment is a later gate.

```sh
npm ci
npm run ci:quick
npm run ci:pr
npm run e2e:pr
```

`ci:quick` runs the locked toolchain check, design-docs audit, scoped ESLint and
Prettier checks, the existing Tailwind/pattern lint, application and tooling
typechecks, parser-based i18n checks, CSP and all declared architecture audits,
including structural budgets and UI strings. It does not launch a browser or
build production assets.
`ci:pr` and `ci:check` run the same required non-E2E sequence:
`ci:quick`, all nonbrowser script, BFF and unit tests, then `npm run build`.
That production build explicitly selects `VITE_RUNTIME_MODE=bff`; the separate
`build:legacy` command is for a deliberately selected standalone artifact.

Root `test` and `test:watch` use the installed Vitest/jsdom graph without
rewriting `node_modules`. On 2026-09-28, a fresh locked `npm ci` followed by
direct, unpatched Vitest passed 279 files and 1,628 tests on Node 24.21.0.
After removing the obsolete patch hook and shims, `npm test` passed 279 files
and 1,628 tests on the same installed graph. Five added Node script-test cases
check Czech UTF-8 HTML, UTF-8/UTF-16 BOM precedence, Windows-1252 bytes that
differ from Latin-1, DOMParser and FileReader. This establishes the pinned
Node/jsdom unit-test runtime; it does not certify other supported Node versions,
browser engines or deployed text decoding. Re-run `scripts/dom-encoding.test.mjs`
after a jsdom, encoding or Node pin change. The fresh-install and pre-change
full-suite logs are local session evidence, not published CI artifacts.

The source quality gate uses ESLint 9 with TypeScript parsing, React Hooks and
JSX accessibility rules, plus Prettier 3. The versioned
[`lint-coverage.json`](../../scripts/fixtures/lint-coverage.json) adopts eight
source files: early bootstrap failure/runtime mode, the idle-session hook, two
shared hooks, and the Input, Checkbox and ConfirmDialog primitives. These files
receive `rules-of-hooks`, `exhaustive-deps`, ARIA/role, form-label and keyboard
interaction checks. `lint:scoped` and `format:check` are required by `ci:quick`;
`quality:coverage` runs the source inventory alone. Formatting also checks the
new tooling/configuration/test files. The pre-existing custom audits still run.

The gate inventories all non-test TS/TSX source beneath `src/app`,
`src/lib/auth`, `src/lib/hooks` and `src/components/ui`. At the reviewed source
revision, 82 files are eligible: eight adopted and 74 deferred by exact SHA-256.
The manifest records the maintainer owner and removal condition. A new file,
changed deferred file, deleted path or source symlink fails until that file is
adopted and passes both tools. The same filesystem inventory runs with or
without `.git`; a Gitless archive cannot silently treat its changed-file set
as empty. Do not refresh a deferred hash to avoid a newly reported diagnostic.

The tooling typecheck uses [tsconfig.tooling.json](../../tsconfig.tooling.json)
with the existing strict compiler flags, Node-only globals and no emit. It
covers the Vite and Playwright configurations and all TypeScript under `build/`.
Vite and Playwright load their ESM configs at runtime; this gate only compiles
them. The root lock selects `@types/node` 24.19.0 for the Node 24 toolchain.
The initial inventory found 23 environment index-signature errors in the two
configs. Indexed access resolved them without changing the selected values.
Compile-only fixtures accept a schema-1 build record and valid Playwright
options. They reject a schema-2 record and a string retry count. They do not
launch a browser or import an executable config.

The initial full-scope ESLint inventory found 12 diagnostics in ten deferred
files. Nine `exhaustive-deps` messages occur in `src/app/toasts.tsx`,
`src/components/ui/{Drawer,HostIpLookupInput,LockBadge,Modal,NodeLookupInput}.tsx`
and `src/lib/hooks/{useCountedKeysetPagination,useKeysetPagination}.ts` (two in
the latter). `Button.tsx` has a noninteractive span with click handlers;
`StackedBar.tsx` names an unavailable legacy React rule; and
`useKeysetPagination.ts` has an unused legacy rule-disable comment. These are
recorded findings, not accepted ESLint exemptions. The WebUI maintainers own
adoption when a deferred file changes or the reviewed scope expands; any
behavioral fix needs focused tests and review. E2E and BFF static type coverage
remain separate open work. A strict E2E no-emit preflight found 231 diagnostics
in 75 files. Even a diagnostic-only probe disabling index-signature and
unchecked-index checks left 90 diagnostics in 29 files, including fixture
contract and inferred mock-shape mismatches. No E2E compiler gate or relaxed
E2E config was added; its staged adoption needs a separate reviewed scope.

In GitHub Actions these appear as separate nonbrowser and production-build jobs;
the build job records `GITHUB_SHA` in its summary. Root and BFF production
dependency audits retain their critical/high thresholds as separate online CI
steps. The dev-host TLS audit requires DNS/network access and remains a separate
operator check. The browser script regression has its own required Chromium job.

The PR browser workflow runs desktop `e2e:pr:desktop` and mobile
`e2e:pr:mobile` in independent matrix jobs with separate artifacts and no matrix
fail-fast. Main/manual broad smoke and nightly desktop/mobile jobs are separate
signals; browser fixtures do not establish live API behavior. Release readiness
also requires later built-assets/nginx/BFF and pinned-API evidence.

The wrapper runs the installed `@playwright/test` CLI only when its version
matches `e2e/PLAYWRIGHT_VERSION` and `package-lock.json`. Browser-launching CI
jobs install the locked Chromium with `e2e:install -- --with-deps chromium`;
the script regression sets its executable to that Playwright browser. The
`--container` system-browser and policy-relaxation shortcut is only for explicit
local use. Node setup uses [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0)
on GitHub-hosted Ubuntu runners; its [minimum runner version is 2.327.1](https://github.com/actions/setup-node/blob/v7.0.0/README.md).

The i18n audit checks all literal locale modules and root aggregators before
spread composition for duplicate definitions, en/cs keys, placeholders and
plural groups. Rendered tests are still needed for interpolation at call sites
and language switching.
For changed count copy, check rendered output in both languages at 0, 1, 2, 4,
5 and 11, and at a fraction when the displayed value can be fractional. Check
the early bootstrap screen and BFF OAuth error page separately: neither waits
for the lazy application catalog. Source/catalog tests cannot certify a deployed
login flow or the effective API locale for transaction-provided labels.
PR Playwright uses deterministic fixtures. Inspect [workflows](../../.github/workflows)
and [Playwright config](../../playwright.config.ts) for exact current selection,
projects, timeouts and artifacts. Broad/nightly checks and optional audits are
separate from the PR selection; do not assume every npm audit script runs in CI.
Use focused tests during a small change, and an integrated candidate before a
multi-PR release. Repeat the full suite only for relevant changes or new failures.

`npm run docs:inventory` regenerates route/API inventory; `audit:design-docs`
checks it, local handbook links/requirement IDs and external redesign references
across regular Markdown, TypeScript and CSS source files. It uses the same sorted
filesystem walk in a checkout and Gitless archive, includes unstaged source,
prunes generated trees and rejects source symlinks. These are documentation
consistency checks, not a substitute for semantic review or backend tests.

The structural audit keeps the historical baseline unchanged. It writes a complete
JSON inventory to `work/audits/structural.json`, with old/current/excess values for
every raw per-file and aggregate rule. `scripts/fixtures/structural-debt-ledger.json`
records inherited exceptions by exact path, rule, source revision, SHA-256
content hash, current metric allowance, rationale, owner and removal condition.
Its review status starts `pending`; validated entries remain proposed and the
audit fails until the lead explicitly accepts this exact ledger. The session
lead accepted the original 43 exceptions after matching their hashes against the
recorded source revision `e7ce3d73e799fc60e5933fe23bdb3a979eb4d6b9`.
The header and lifecycle power-control extractions reduced `VpsLayout.tsx` and
`VpsLifecyclePage.tsx` below their historical line ceilings, so their two
`grown-over-500` exceptions were removed. The remaining ledger has 41 accepted
entries; their recorded hashes, metrics, allowances and baseline are unchanged.
Raw violations, proposed/accepted exceptions, unaccepted violations and invalid
entries are separate report fields. A changed or deleted file, resolved rule, expired
removal condition, changed allowance or unlisted new violation fails the audit;
aggregate adjustment comes only from active accepted entries. The ledger is a
temporary disposition, not a new baseline. Remove an entry as soon as its rule
is resolved, and review any source edit before replacing its recorded hash.

The UI-string audit excludes only `*.test.tsx` fixtures from its source walk.
Production TSX still participates. Focused fixture tests cover that distinction and
the structural failure cases. A passing quick gate is local source evidence;
production build, browser scripts, PR matrix and remote CI remain separate gates.
The structural audit passes for the accepted source bytes. Record the exact
locked-toolchain quick gate and production build results for each candidate
separately from this source audit.

## Recorded release evidence (2026-09-27)

The [work log](../../WORK_LOG.md) records release `fd290b5e` (PR517–520), including
exact counts and limitations. Its integrated tree passed unit/script/BFF/static
checks, 681 full PR fixture cases and targeted Chromium/WebKit checks. Post-deploy
browser cases still used synthetic API fixtures; actual anonymous provenance,
health/session/auth routing checks also passed. These facts do not certify a live
VPS deletion simply because a delete dialog fixture passed.

Historical failed run [36274080869](https://github.com/Kerrycek/clankerdev/actions/runs/36274080869)
was superseded by [successful 36276637276](https://github.com/Kerrycek/clankerdev/actions/runs/36276637276)
after correcting exact settings-PUT test guards. Preserve the failed history and
fix the expectation for the real contract; never remove protection to get green.

Earlier isolated VM evidence is recorded for auth/MFA/sessions, VPS, DNS publication,
local/remote restore and a scoped user-data scenario. Full local artifacts have not
all been transferred into public durable CI storage. Reconcile receipts and pins
before reuse; do not present them as a fresh exact-candidate certification.

## Beta acceptance checklist

This replaces percent-based readiness claims. Each unchecked gate needs a named
review owner and a durable evidence link before closing it.

- [x] Reviewable deployed frontend/BFF baseline and previous rollback revision
  recorded for the 2026-09-27 release (not an approval for the next release).
- [x] Existing release fixture/static evidence identified and scoped honestly.
- [ ] User-data, IP history and dataset/snapshot contracts resolved on the selected
  API; rejected backend proposal/dependent PR status explicitly decided.
- [ ] Adversarial multipage matrix complete for each affected collection: IDs,
  timestamps/ties, owner scope, errors, end, reload/back, no loss/duplication.
- [ ] Full admin application/account lifecycle certified against the exact isolated
  UI/API candidate, including permissions, failed requests, persisted state and cleanup.
- [ ] Dev soft-delete default retention chosen and verified through an authorized
  configuration change, or explicitly excluded from the beta's supported scope.
- [ ] Mobile error-toast/Cancel overlap resolved and checked in cs/en.
- [ ] Live audit consumers of session.json match sessionKey/expiry contract while
  retaining origin/security checks.
- [ ] Prior real auth/MFA/session, VPS, DNS publication and local/remote restore
  receipts reconciled against candidate changes; revalidate affected paths only.
- [ ] KB minimum has current page bindings, reviewed text and real cs/en captures
  with independent pins; publication/cutover policy agreed.
- [ ] Current candidate reviewed on member/admin, desktop/mobile, cs/en and both
  themes; pending visual PRs are not mistaken for already-deployed behavior.
- [ ] Independent code/security audit scope, reviewer, findings and dispositions recorded.
- [ ] Handover owner has source, docs, private operational access transfer, validated
  rollback runbook and known limitations; explicit release authorization recorded.

## Required high-value regression matrix

| Area | Scenarios |
| --- | --- |
| Auth/session | anonymous endpoints, login/failure, MFA/passkeys, idle expiry, token rotation across tabs, reload, logout races, persistence after login |
| Permissions | owner vs other owner, admin My vs admin view, support capability restrictions, direct routes, API denial |
| Mutations | valid/invalid draft, rejection in dialog, acceptance receipt, failed chain, missing receipt, lost response, reload/tab locks, reconciliation |
| VPS/storage | creation late defaults, compute/disk overrides, console entry/revoke, soft/hard/retention, snapshot/restore/replication and cleanup |
| Requests | current/resolved states, orphaned owner, risk unknown/high, correction token, approve/reject/ignore/correction, queue and retained errors |
| DNS | record validation, secret handling, permission failure, transaction and actual published response |
| Navigation | active route, keyboard focus, mobile drawer, compact labels, long names, localization, back/forward/query state |

## Reporting a failure

Record sanitized reproduction, exact revision/environment, expected vs actual,
first failing boundary and whether a mutation may have been accepted. Preserve
trace/receipt privately if it contains data. Investigate test drift versus product
regression; do not dismiss a failure based solely on another passing run. A passing
retry is not automatically a resolved race. Update the requirement/work log with
the limitation and evidence needed to close it.
