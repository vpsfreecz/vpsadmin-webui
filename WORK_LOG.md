# Project work log

This is the versioned record of work on vpsAdmin WebUI Next (Clankerdev),
started on 2026-09-27 at the maintainer's request for a future handover.
It records decisions and evidence; it does not replace the product specification,
Git history, deployment runbooks, or issue tracker.

Dates below use Europe/Prague unless an explicit UTC timestamp is given.
Entries before the start date are selective retrospective summaries, not a
complete reconstruction of the project. Missing evidence is not a passing check.

## New changes

Record new changes in separate files under [docs/work-log](docs/work-log/README.md)
to avoid conflicts between concurrent PRs. Keep the historical entries below.
Follow-ups belong in the corresponding change file, not a shared status block.

## Reading and maintaining this log

- Read the latest entries before starting work. Add an entry with each meaningful
  change, investigation, review outcome, deployment, or blocker.
- Record the request, what changed and why, PR/commit references, verification,
  deployment status, and a concrete next step or known limitation.
- State whether browser evidence used synthetic API fixtures, a real isolated
  API, or anonymous public endpoints. Do not describe fixture tests as live
  lifecycle certification.
- Append dated follow-ups for merge/deployment outcomes; retain earlier entries
  as history. A prepared PR is not a deployed change, and one green CI run does
  not establish release readiness for unrelated work.
- Link durable repository/CI evidence. If evidence exists only in an operator's
  local files, identify that limitation without publishing private paths or data.
- Do not store credentials, session tokens, personal data, private screenshots,
  or raw production responses. This log does not grant deployment authorization
  or enable autonomous scheduled development.

## 2026-09-30 - Integrate approved PRs 1 through 8 for three sites

The maintainer explicitly authorized merging all eight WebUI PRs and deploying
one release to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz.
The integration retains the original commits and authors. Conflict resolution
unions every adopted E2E source, updates exact coverage counts, retains all work
logs, and combines the compact console shell with the creation-progress banner.
Resolved structural exceptions remain removed. Formatting uses the existing
pinned Prettier version. The original checkout's pending instructions are untouched.

Preflight found newadmin at 534caa83 and both older sites at 156a7c04. The older
BFF services require migration from environment secrets to systemd credentials
for the current canonical source; existing values and session stores must be
preserved. The dev root filesystem is full, so staging and evidence use /data.
The newadmin release follows the separate configuration repository and confctl.
Checks and deployment receipts will be appended after actual completion.

## 2026-09-30 - Keep desktop navigation expanded

**Request / reason:** the maintainer finds icon-only navigation unusable and
requested removing its toggle. New work uses `dev/always-expanded-sidebar`;
the maintainer permits previews on dev.crucio.cz or clankerdev.vpsfree.cz,
without authorizing a merge or deployment to newadmin.vpsfree.cz.

**Change:** remove desktop collapse controls and icon-only rendering. Keep the
256px labelled menu, role-dependent groups and the mobile drawer. Ignore old
local/server collapse preferences while preserving theme, language, dashboard
and tips settings. Update REQ-004/REQ-005 and adopt changed settings/browser
files into existing quality checks rather than updating deferred hashes.

**Verification / status:** the locked Linux Nix shell (Node 24.21.0,
npm 11.19.0) passed `ci:quick`, 19 focused settings/sidebar unit tests and
16 Chromium desktop/mobile fixture scenarios. Browser cases cover cs/en,
user/admin labels, the 256px width, old local and server collapse values,
reload, drawer navigation, preference reset errors and theme persistence
through expiry/fresh login. These are synthetic fixtures, not live API tests.
Screenshots are captured by the sidebar spec. The settings model and both
changed/new browser specs are now included in the existing lint/type gates.
Moving sidebar-specific translation/tips wiring into AppSidebar reduces
AppLayout to its historical budget and removes its exception; no budget was
increased. The production BFF-mode build passed (existing large-chunk warnings).

The local host cannot resolve Nix; checks ran in a separate build directory
on the Linux dev host, not in the deployed application. Localization references
were read from Git objects at the exact locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, also resolved by Nix on Linux.
No translations were added. KB screenshots containing the old collapse button
may need regeneration; this change does not certify external KB contracts.
**CI follow-up:** two coverage-harness expectations still assumed the original
11 checked/228 deferred files. Update those explicit expectations to the actual
13 checked/227 deferred files. The full compiler-closure and Gitless checks,
and all negative coverage fixtures, remain required. No source is waived.
All 222 script tests passed with the pinned Node runtime after installing
the missing BFF dependencies in the isolated scratch build directory.

Not merged or deployed.

## 2026-09-30 - Remove password reset from public navigation

**Request / reason:** the maintainer wants a simpler public entry page; password
recovery is reached through sign-in rather than a separate index shortcut.

**Change:** remove the recovery link from the shared public desktop header and
mobile menu. Preserve sign-in destinations, locale controls, the configured
provider recovery URL and the login-required/expired-session recovery action.
Record the intent in REQ-054 and the public workflow. This independent change
uses `dev/public-login-recovery` and does not include the sidebar PR.

**Verification / limits:** in the locked Linux Nix shell (Node 24.21.0),
12 focused PublicLayout/password-recovery unit tests, `ci:quick`, production
build and six existing public-overview/theme/language browser cases passed.
Four additional screenshot checks passed for cs/en on desktop/mobile, showing
sign-in without a reset shortcut. These use synthetic API fixtures, not live
provider or email delivery tests. Screenshots/logs are retained in the operator
handoff; the build keeps its existing large-chunk warning. No new wording or
catalog changes; localization reference is the locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, resolved through Nix on Linux.
Existing unit expectations are updated to require sign-in and reject the old
shortcut, even when a recovery URL is configured. No recovery email is sent.
No server/API change, merge or deployment. Public-navigation KB screenshots
may need regeneration; external KB contracts are not certified here.

## 2026-09-30 - Keep personal account views scoped to their owner

**Request / reason:** header Account / Sessions showed every user's sessions to
an administrator, which looked like foreign logins to their own account. The
maintainer requested checking adjacent account pages as well (REQ-040).

**Findings / change:** Sessions and Metrics omitted the admin owner filter.
Pass the authenticated ID only for administrators; regular/support users retain
the API-enforced scope, including the metrics API's ban on explicit user input.
Keep personal metrics copy distinct from another user's administrative dossier.
Session ID searches now inherit the existing owner check. Namespace and map
personal deep links also lacked an owner check: verify it before mounting detail
queries/actions. Other account tabs use explicit IDs/scoped paths; user-data's
independent API contract issue remains REQ-042. Dedicated user administration
remains available and is tested separately.

**Contract:** inspected the pinned vpsAdmin API resources at
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. No API change, new role or catalog text.
**Verification:** pinned Node 24.21.0 / npm 11.19.0 on the Linux scratch
workspace: `ci:quick` and production build passed (existing large-chunk warning).
Seven session/metrics model unit tests and 16 E2E coverage-harness tests passed.
Fourteen new owner-scope browser scenarios passed; after adding the exact header
Account navigation and improving screenshot scroll position, the eight affected
cs/en desktop/mobile scenarios passed again. Twelve adjacent-account scenarios
passed (profile, SSH/session actions, mail, security, MFA and namespace edits).
The existing metrics browser suite also passed all six desktop/mobile cases.
Screenshots/logs are retained in the operator handoff and were shown during work.
A first broad invocation included a desktop-table-only SSH test in the mobile
project, where its hidden-table expectation failed; its intended desktop run
passed, and new scope scenarios explicitly handle both rendered layouts.
The new browser spec is adopted into strict E2E coverage with explicit inventory
expectations updated; no check was bypassed. Final E2E typecheck passed.
**Status:** prepared on `dev/account-personal-scope`, not merged or deployed.
Browser tests use synthetic users; no production session/token was changed.

## 2026-09-30 - Global search

See the [per-change search log](docs/work-log/2026-09-30-global-search.md)
for the request, contract diagnosis, checks and deployment status.

## Per-change entries

New work uses a separate file under `docs/work-log/` to avoid shared-log conflicts.

- [2026-09-30 — Immediate VPS detail after accepted creation](docs/work-log/2026-09-30-vps-create-detail.md)

## 2026-09-30 — Profile-change review layout

See the [per-change work log](docs/work-log/2026-09-30-change-review-layout.md)
for the full-width comparison, embedded metadata, decision placement and checks.
Prepared for review; not merged or deployed.

## 2026-09-29 - Send verified OAuth session identity to the provider

**Request / reason:** newly created API sessions need the client's callback
address and an identifiable WebUI service User-Agent. The public edge and
private backend already normalize forwarding, but the BFF's outbound code
exchange previously omitted both identity headers.

**Change:** code exchange now validates Express's callback `req.ip` as one bare
IPv4 or IPv6 address and sends it as `Client-IP` with the exact service
`User-Agent: vpsadmin-webui`. Missing or invalid derived addresses consume the
one-use state and take the sanitized recovery route before provider contact.
Refresh and both logout revocations use that User-Agent without `Client-IP`.
Inbound browser identity headers are not copied. A synthetic HTTPS VM provider
records only route and those two outbound headers to check the actual client
address through both nginx hops. Existing sessions, credentials, cookies,
refresh serialization and session storage are unchanged.

**Verification / limits:** the pure security and runtime-configuration test
files, BFF core static gate, design/active-document and structural audits,
scoped lint/format, Nix syntax/format and diff checks pass with cached Node
24.21.0 and nixfmt 1.5.0. This sandbox cannot open loopback listeners
(`listen EPERM`) or the Nix flake fetcher cache, so the full BFF HTTP/session
suite, module evaluation and ordinary HTTPS VM remain for normal-environment
exact-head verification. Fixture results will establish emitted headers and the
synthetic proxy topology, not production session database metadata. No live
provider request, site pin, push or deployment was performed.

## 2026-09-29 - Load BFF credentials from private systemd files

**Request / reason:** the published service passed OAuth and session secrets
through a root-read `EnvironmentFile`. The operator chose a direct cutover to
systemd credentials, without accepting both interfaces at runtime.

**Change:** read three fixed raw UTF-8 credential files before opening the BFF
listener, reject the retired environment variables in every mode, and keep
their values out of process environment and command arguments. The NixOS
module now requires three runtime source paths, passes them through
`LoadCredential`, and removes the retired names with `UnsetEnvironment`.
The package includes the reader, the file session store explicitly disables
asynchronous reaping, and synthetic BFF/module/VM fixtures exercise startup,
session persistence and environment isolation. Public config, OAuth and
session response contracts and the on-disk session directory are unchanged.
The site pin and credential provisioning belong to a separate operator-owned
cutover; keep the old private environment file only for rollback to the
previous published service, never as a fallback for this version.

**Verification / limits:** the credential reader and production configuration
tests pass with cached Node 24.19.0. The sandbox prevents loopback listeners
(`listen EPERM`) and Nix daemon access, so HTTP/session suites, build-free
module evaluation and the ordinary HTTPS VM require normal-environment checks
on the committed head. No live secrets, accounts or provider calls were used.

## 2026-09-28 - Preserve browser retry evidence and bound PR workers

**Request / reason:** the PR browser jobs did not set an explicit worker count,
and report/results uploads ran only when the final job failed. A flaky first
attempt followed by a passing retry could therefore lose its failure evidence
from CI artifacts.

**Change:** set two workers in the Playwright config and both PR desktop/mobile
commands. An appended `--workers=1 --retries=0` remains a deliberate diagnostic
override. Upload the HTML report and any retained failed-attempt results after
every PR, broad and nightly browser job, including an overall pass, while
preserving distinct desktop/mobile jobs and the seven-/fourteen-day retention
periods. Keep the existing `retain-on-failure` trace/video, failure screenshot,
retry and timeout settings. A browser-free contract test checks the actual
pinned CLI's final-option behavior, config capture mode and workflow uploads.
No browser fixtures, product behavior, dependencies or package hashes change.

**Verification / limits:** browser-free runner, wrapper and CLI script tests,
tooling typecheck, lint, scoped formatting, design-doc audit and YAML parsing
pass with cached Node 24.19.0. The pinned Playwright implementation retains a
trace for a failed attempt even when its later retry passes; the workflow now
uploads that result when the job completes. Sandbox Nix evaluation could not
open its fetcher cache, so the exact locked quick gate remains pending. Source
inspection and static fixtures do not demonstrate a live retry or inspect a
generated artifact. The lead will run controlled desktop and mobile browser
suites after review.

## 2026-09-28 - Check the BFF session queue's static contracts

**Request / reason:** BFF JavaScript had no required static type gate. A strict
three-module inventory found 109 diagnostics: 64 in runtime config, 38 in
security and seven in the session queue. Runtime config imports security, so
its larger closure needs a separate reviewed change. The standalone queue is a
bounded first unit.

**Change:** add a strict `allowJs`/`checkJs` no-emit project for the CommonJS
session queue and a precise declaration for the deployed `cookie-signature`
module's two functions. Checked JSDoc records queue options, request cookie,
response and `next` callback contracts. The queue still releases only after
the wrapped response end; the forwarding call retains the same arguments and
receiver. A compile-only fixture runner checks the exact source closure and
rejects wrong secret/limit, cookie and callback types. Require it in `ci:quick`.
The BFF runtime package and both dependency locks remain unchanged.

**Verification / limits:** the checked queue project, positive/negative
compile fixtures and a browser-free queue regression pass with cached Node
24.19.0. The runtime-config and security unit tests, lint, formatting, design
documentation and structural audits pass. The existing queue runtime test
cannot bind loopback in this sandbox (`listen EPERM`); it requires a
normal-environment run with the BFF rejection and race suites. The exact locked
Node 24.21.0 quick gate is also pending. Runtime config, security, server and
response pages remain outside static checking; this does not certify their
types or deployed behavior.

## 2026-09-28 - Adopt a strict E2E fixture and smoke-spec core

**Request / reason:** a full-suite E2E TypeScript preflight exposed inherited
fixture and spec contracts too broad to correct in one small change. An explicit
core makes shared mock errors visible in the quick gate without hiding the
remaining suite behind relaxed compiler flags.

**Change:** add a no-emit E2E project with eleven named roots: nine fixtures and
helpers plus authenticated-home and public theme/language smoke specs. Preserve
strict, unchecked-index, index-signature and override checks, and the actual
DOM/Playwright support declaration. Correct the shared router's required body
methods and unknown-result guards, type the partial window bootstrap, and fix
one DOM dataset access without changing the synthetic request/response flow.
A source/archive-safe inventory binds 228 deferred existing specs to their
initial path and SHA-256 at source revision
`abab859d94a3f364d2bb719fa09f00749fd69ef9`; new deferrals and changed
deferred bytes cannot pass. The quick gate requires the core compiler and
coverage check. A separate full-strict diagnostic command remains nonzero.
Neither the dependency locks nor package hashes change.

**Verification / limits:** the explicit TypeScript program contains exactly
the eleven adopted E2E files, with zero core compiler diagnostics and zero
coverage violations. Nine compile-only cases cover both valid mock call forms,
phantom fields, wrong arguments, unknown JSON and retained strictness. A
browser-free router harness covers both installation forms, user precedence,
body/query merge, handler selection, fallback, direct response and malformed
JSON behavior. Sixteen coverage fixtures exercise checkout and Gitless
positive/negative paths. The full-strict diagnostic command still fails with
198 diagnostics in 68 files after the shared fixes; those files are not waived
or described as checked. Focused checks used cached Node 24.19.0: core and
tooling typechecks, the affected script tests, lint, and Prettier on 35 reviewed
files. The 19-document design audit and unchanged structural budget also passed.
The exact locked Node 24.21.0 quick gate remains for normal-environment review.
Browser, live API, package/VM and deployment evidence remain separate.

## 2026-09-28 - Typecheck build and browser-runner configuration

**Request / reason:** the application typecheck excluded the Vite and Playwright
configs and build metadata helper. Incorrect config options or build record
shapes could pass the required quick gate.

**Change:** add a strict no-emit TypeScript project for `vite.config.ts`,
`playwright.config.ts` and `build/**/*.ts`, and require it in `ci:quick` alongside
the existing application check. Change only the typed syntax of environment
lookups in both configs; their runtime values and ESM loaders stay the same.
Align root Node declarations to major 24. Compile-only fixtures check that
schema-2 build metadata and a string Playwright retry count fail. The fixtures
do not import executable configs or start a browser. The BFF dependency graph
and existing audits are unchanged.

**Verification / limits:** the initial tooling inventory contained 23
index-signature diagnostics, all resolved by indexed lookups. A strict E2E
preflight produced 231 diagnostics in 75 files; a diagnostic-only probe without
the extra index-signature and unchecked-index checks still produced 90 in 29.
E2E and BFF static checking remain separate work; no E2E config or relaxed
strictness was added. The normal-environment root install selected
`@types/node` 24.19.0 and `undici-types` 7.24.6; root lock SHA-256
`70e154eee63b217dd934e412363b5b1dff59ce51ca78e83556d4939823f385e9`
prefetched to `sha256-1AItkFu1tvJpKjFVbGC/IWky4JPfw+d+XU50egk+/TE=`.
The BFF lock/hash are unchanged. The same six optional WASI nested packages
still lack resolved URLs in prefetch; the exact-head x86_64 package build must
establish whether the cached closure is sufficient. Focused tooling and
application compiles, four compile-fixture cases, five build-info unit tests,
format check, design-doc and structural audits passed with cached Node 24.19.0
and the installed root graph. The exact locked Node 24.21.0 quick gate remains
pending. No browser, package build, VM or deployment result is claimed here.

## 2026-09-28 - Check a bounded source set with ESLint and Prettier

**Request / reason:** custom Tailwind and pattern audits did not check React
Hook dependencies or common JSX accessibility mistakes, and no formatting
check ran in the required quick gate. Broad adoption would mix inherited
diagnostics with unrelated product changes.

**Change:** pin development-only ESLint, TypeScript parser, React Hooks and JSX
accessibility plugins, and Prettier. The quick gate now checks eight reviewed
bootstrap/auth, shared-hook and UI primitive files while retaining the custom
audits. A versioned coverage inventory records the other 74 eligible source
files by exact hash, owner and removal condition. New or changed eligible
source must be adopted; checkout and Gitless archive use the same walk.
Prettier changed only whitespace/line wrapping in the adopted bootstrap
failure and idle-session hook files. No product behavior, BFF graph or
structural baseline/exception changed.

**Verification / limits:** full-scope diagnostic inventory reported 12
messages in ten deferred files: nine Hook dependency findings, one JSX
interaction finding, one unavailable legacy inline rule and one unused legacy
disable. The eight adopted files lint cleanly. Six focused fixtures prove
missing Hook dependency, invalid click/keyboard and ARIA/label controls,
unformatted source, changed/new deferred files, and actual Gitless inventory
parity. The normal-environment pinned install updated only the root lock:
214 added package entries, no removed or changed existing package versions.
Pinned prefetch of the unchanged final root lock SHA-256
`0c987cd5ceb0c09246aad8543b7394421ff00c0428aa8b8cec5639f84c00e916`
produced `sha256-q4Xy2p/fhQ9PrI2CQJE4vWRe/jObemXdOSGeBgEYwxI=`; the separate BFF
hash is unchanged. Its six missing resolved URLs are bundled, optional
dependencies nested under `@tailwindcss/oxide-wasm32-wasi`, not an observed
x86_64 production-package omission. An actual package build must confirm that
the dependency fetch succeeds. Focused `lint`, `format:check`, gate fixtures,
design-doc and structural audits, typecheck, and the affected bootstrap,
idle-session and dialog tests passed on the draft. The locked full quick gate
and exact-head package build remain pending; no browser, VM, live API or
deployment behavior is certified.

## 2026-09-28 - Run DOM tests on the installed dependency graph

**Request / reason:** the unit-test commands previously changed installed
jsdom, parser, encoding and Web IDL packages before every run. The patch could
silently skip missing or changed targets, so a green test result did not prove
the declared lockfile graph worked by itself.

**Change:** remove the test-command patch hook, its script and both unused
encoding shims. Add direct DOM regressions for Czech UTF-8 HTML, UTF-8 and
UTF-16 BOMs, Windows-1252 characters outside Latin-1, DOMParser and FileReader.
The root manifest's dependencies and both lockfiles remain unchanged; esbuild
remains a transitive Vite dependency and is no longer imported by repository
code.

**Verification / limits:** after a fresh locked root `npm ci` in the normal
environment, direct unpatched Vitest passed 279 files and 1,628 tests in 29s
on Node 24.21.0. The five new focused Node script-test cases passed on that
pristine install; after removing the hook, `npm test` passed 279 files and
1,628 tests in 28.52s. The focused Node test, typecheck, locked-toolchain check,
design-doc audit and structural audit passed. The full script-test command
passed 21 of 27 files in this sandbox; six existing files need unavailable
loopback listeners or child-process behavior, so that aggregate gate remains
unverified here. No Nix daemon access was available in the sandbox.
The local dependency graph is jsdom 27.4.0, html-encoding-sniffer 6.0.0,
`@exodus/bytes` 1.9.0, parse5 8.0.0 and webidl-conversions 8.0.1. This
checks the pinned Node unit-test runtime, not other Node releases or a browser.
Fresh-install and pre-change logs are local session evidence; exact committed
source and remote CI checks remain to be verified.

## 2026-09-28 - Prepare an isolated HTTPS service test

**Request / reason:** module evaluation covers configuration, but the actual
edge, backend nginx and BFF route and session boundaries need a runtime test.

**Change:** expose `checks.x86_64-linux.nixos-webui` as a three-node NixOS VM
fixture. A synthetic TLS edge and HTTPS OAuth provider front the private
backend and a separate client. The fixture checks peer and forwarding trust,
static/BFF routing and cache/CSP ownership, secure host-only cookie and
one-use OAuth state, login across a stopped-and-started BFF, startup rejection
of missing/weak secret files, and private BFF state. A seeded synthetic file
under `/var/lib/vpsadmin/webui` must retain its owner, mode and content across
BFF start and restart. Disabled-module and locked legacy-PHP coexistence
assertions are required build-free inputs. The existing passkey response has
a fixed provider-scoped CSP, not a nonce, and the fixture checks that policy
through both nginx hops. It now also checks that OAuth code/state markers stay
out of backend and edge access/error logs during separate upstream failures,
while non-OAuth errors and another vhost's access log remain observable. The
explicit HTTP redirect retains an HTTP-01 challenge path. The extended fixture
passed on the uncommitted draft in 176 seconds; committed-head verification is
pending. Its synthetic HTTPS vhosts enable nginx certificate
directives explicitly. Around the `Type=simple` BFF unit, the test waits for
weak-secret rejection after exit and for the listener after restart. No
application or site configuration behavior changed.

**Verification / limits:** Nix syntax/format and the source design audit pass
locally. The normal-environment module evaluation passed all ten results, and
the HTTPS VM fixture passed in 2m45s on the uncommitted three-file draft. The
VM log is local to the session; this is evidence for the draft tree. Package,
module and VM verification on the exact rewritten head remains open. The
sandbox cannot connect to its Nix daemon. The fixture uses no real API,
accounts, DNS or credentials and grants no deployment authorization.

## 2026-09-28 - Add a separate private NixOS WebUI service

**Request / reason:** immutable frontend and BFF packages need a reusable
disabled-by-default host contract without enabling the legacy PHP WebUI or
putting secrets into the Nix store. The BFF requires one private writable
session directory and normalized proxy identity from a private backend hop.

**Change:** export `nixosModules.default` with typed `services.vpsadmin-webui`
options and enabled-state assertions. It selects matching package provenance,
uses the dedicated `vpsadmin-webui-bff` account and a fixed
`/var/lib/vpsadmin-webui` systemd state directory at mode 0700. It creates a
0700 `sessions/` child before BFF execution. No state-directory override can
redirect systemd ownership handling into the legacy PHP state tree. The service
emits production public settings and loads only the runtime secret-file path;
it binds BFF to loopback and retains startup validation. Private nginx uses an
explicit listener, original-peer allowlist, separate trusted-edge set and one
normalized forwarding chain. It routes exact config/session/health and OAuth
requests to BFF, suppresses OAuth access and error logs in both OAuth locations,
and separates static CSP from
BFF-owned response CSP. Each location owns its response headers because nginx
does not inherit server-level `add_header` values into locations that define
their own. The existing OpenStreetMap/Nominatim origins stay in the static
policy. No site address, secret value, VM service test or site
configuration was added. The [service guide](docs/design/NIXOS_SERVICE.md)
records the operator boundary and remaining proof.

**Verification / limits:** build-free fixtures inspect disabled, valid,
malformed, package-mismatch, rejected state-directory overrides and actual
pinned legacy-PHP coexistence configurations. The draft with headers in their
owning locations passed all ten build-free results in the normal environment,
including rejection of an explicit state-directory override and coexistence
with the locked legacy PHP module. An available nginx 1.30.2 parsed a locally
assembled map/vhost configuration, but this sandbox denied the socket check
needed by `nginx -t`. Nix syntax/format, the inline-bootstrap CSP hash test
and design audit are focused local gates.
Rendered nginx and VM verification on the exact rewritten head remain open.
No exact-head VM build, push, default-branch integration or deployment occurred.
No KB page or screenshot changes are supported by this source-only module work;
the existing capture contract still targets the legacy PHP interface. Assess
preview-specific captures after the module and site are deployed and verified.

## 2026-09-28 - Prepare separate immutable frontend and BFF packages

**Request / reason:** the new NixOS preview needs reproducible static and OAuth
BFF artifacts with matching, truthful source identity. A Gitless build must
not be mistaken for a clean release, and copied Vite public examples must not
become live configuration files.

**Change:** add independent `buildNpmPackage` outputs with pinned Node 24 and
separate unchanged-lock dependency hashes. The frontend builds in required BFF
mode and installs only reviewed static files. The BFF installs its production
runtime graph and an absolute slim-Node wrapper. Cleaned source retains the
linked design audit inputs and leaves source symlinks visible for rejection;
generated/private paths are filtered. A single clean/dirty/unknown flake
provenance value reaches both packages, with explicit dirty state in the
frontend build and matching BFF metadata. Three flake checks cover provenance,
source and installed contents. The dev shell exposes `prefetch-npm-deps`; the
[package guide](docs/design/PACKAGING.md) records the exact commands, hashes
and output boundaries. BFF docs now describe the already required JSON
bootstrap. Pinned `buildNpmPackage` forwards `prePatch` to `fetchNpmDeps`, which
lacks bare `node`; the frontend invokes the pinned Node store path so the
source audit still runs before dependency fetching. No service module, site
configuration or runtime endpoint changed.

**Verification / limits:** the session lead computed independent SRI hashes
with the pinned Nixpkgs `prefetch-npm-deps` 0.1.0: root
`sha256-qipQBgqu4SMKocavlqdFxFugtB2UYEmgX3fRW+UKdTA=` and BFF
`sha256-imijdRISN2eVBsYX79YBxl7zKM7Pjq3rixkKXJNDSvw=`. The root tool
warned about six nested WASI packages without resolved URLs; their likely
platform specificity is not build proof. With cached Node 24.19.0, the eight
source/content checker fixtures, five build-info tests, design audit (18 docs,
68 requirements, 256 routes, 64 API modules), Tailwind/pattern lint and
TypeScript passed. Nix files passed parser and nixfmt checks. The locked
Node 24.21.0/npm 11.19.0 toolchain cannot be used in this sandbox, and Nix
evaluation cannot connect to its daemon. A normal-environment six-output
package/check build passed on a draft tree with the absolute Node call; exact
rewritten-head package validation and runtime-closure inspection remain open.
No browser/VM suite, push, deployment or live API mutation was performed.

## 2026-09-28 - Distinguish graceful shutdown from immediate poweroff

**Request / reason:** the VPS stop request sends `force: false` for a graceful
shutdown and `force: true` for immediate poweroff. The header, list and
lifecycle controls previously labeled both choices as Stop, obscuring the
different effects and their filesystem risk.

**Change:** render Shutdown/Poweroff and Vypnout/Vynutit vypnutí according to
the selected force value in confirmations, submit controls and tracked task
labels. The lifecycle acknowledgment resets when force changes. Mutation
identifiers, payloads, locks and retry behavior remain unchanged. Lifecycle
failure copy follows the submitted force value rather than later form changes.
Header confirmation/password dialogs and lifecycle action-choice rendering moved into
focused components while mutation ownership remains in their pages. The two
pages now meet their original line ceilings, so only their two exact-hash
structural exceptions were removed; all other ledger entries remain intact.
Generic historical task records do not expose force, so their Stop label
remains neutral; newly tracked requests use the submitted force value.
Browser fixtures assert Poweroff for newly tracked forced stops while keeping
the force payload and rejection checks; final branch browser rerun is pending.
The session lead reviewed the English/Czech power copy against the locked
vpsAdmin guide at `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

**Verification / limits:** rendered bilingual force-toggle, confirmation and
payload tests, lifecycle mutation snapshot tests, i18n and structural audits,
TypeScript and documentation checks are the focused local gate. The structural
audit reports 42 raw findings, 41 accepted exceptions, zero unaccepted and zero
invalid entries. Sandbox Nix evaluation cannot connect to its daemon, so the
locked quick gate and production build need a normal-environment run on this
exact commit. No browser suite, live API mutation, deployment or KB write was
performed. Power-control screenshots and member guidance may need later review;
the current KB contract still targets the legacy PHP interface.

## 2026-09-27 - Align Czech terminology and rendered count copy

**Request / reason:** the locked vpsAdmin guide distinguishes account Login from
Nickname, uses Lokace, Hostname, relace and vnořený dataset, and names a powered-off
VPS `vypnuto`. The Czech IP count labels used one form for every number. The BFF
OAuth recovery page used formal address and described an internal response instead
of the failed sign-in. The network rate-limit help said a blank field removed the
limit, although the form omits blank fields from the update request.

**Change:** align the affected account, location, session, dataset and VPS-state
catalog entries with the guide. The mobile interface IP count and matching
address-count catalog entry now use locale plural selection. Reinstall help names
the settings sent with the request without exposing payload identifiers to
members. The BFF recovery message uses plain English and informal Czech.
The early bootstrap copy was reviewed in context and remains unchanged. API
transaction labels remain API-owned; the map call and mutation behavior are
unchanged.

**Verification / limits:** the guide and localization procedure came from the
locked vpsAdmin input at `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
The source was evaluated by the session lead; sandbox Nix evaluation cannot
connect to its daemon. Parser i18n audit, focused bilingual rendered count tests
covering 0, 1, 2, 4, 5, 11 and a decimal case, a rendered BFF recovery-page
test, UI-string and design-doc audits, the structural audit, and TypeScript
passed with cached Node 24.19.0. The 60 focused frontend tests include the
unchanged bilingual early bootstrap path. The lead reviewed the proposed
English/Czech copy. This pass checked all Czech catalog modules for the
identified obsolete terms and the affected English counterparts; it is not
individual linguistic certification of every catalog entry. Exact-head locked
checks and broader browser evidence remain pending. No deployed host or live
API was changed.

**KB impact:** Login, console, VPS power-state, dataset and IP-count wording may
affect member guidance and screenshots. Read-only inspection of the current KB
contract points to management, KVM, IP-address, dataset and User data pages in
both languages. That contract still targets the legacy PHP UI, so its green
status would not certify this React preview. Review page text and fresh cs/en
captures when the preview gains its own pinned KB binding; retain existing
legacy evidence. No KB candidate, screenshot or production page was changed.

## 2026-09-27 - Bound host and IP address inventory to proven ordering

**Request / reason:** the admin IP list used a descending display with a
minimum-ID continuation that could skip records. Host IP lookup also sent an
unsupported `q` filter and treated its first 100 suggestions as all eligible
addresses. The pinned vpsAdmin source at
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` establishes ascending-ID order
for host IPs and effective-admin IPs, but groups non-admin IPs by owner.

**Change:** a bounded ascending-ID loader, its API adapter inputs and adversarial
fixtures support host IP and effective-admin IP traversal. The page integration
uses a single bounded response for non-admin IPs.
Partial results stay visible with English/Czech status and safe actions; the
admin's alternate sort controls apply to loaded rows only. Old unsupported
search/cursor URL settings reset visibly. Host IP filtering and DNS lookup use
exact `addr`; an ID outside the DNS suggestion sample requires a filtered,
server-returned exact-ID check. Filter/identity changes discard pending lookup
and PTR results. The Host IP table moved to a cohesive component, keeping the
page below its unchanged structural threshold. The user-facing copy received
the lead's review against the locked Czech guide.
The browser fixtures provide an exact eligible detail response before opening
the PTR editor and assert removal of unsupported URL page/from_id cursors while
retaining supported filter and result checks. The admin IP fixture now models
250-row ascending API batches separately from local visible page sizes, and
checks continuation, local navigation, exact-filter reset and row actions.

**Verification / status:** on pre-rebase source
`830a45d0ec6d95e520abdef85f08c45117cd56f5`, cached Node 24.19.0 ran 85
focused and adjacent tests across 12 files,
TypeScript, both lint scripts, i18n, UI-string, page, component, overlay,
lookup, mutation, design-doc and structural audits. Structural reporting found
44 raw violations, 43 accepted inherited exceptions and no unaccepted or
invalid entries; no ledger allowance or baseline changed. Regenerating the
source inventory added one API module (64 total). The lead also ran the locked
Nix `ci:quick` and production build on that pre-rebase commit; both passed in
83 and 25 seconds respectively. Exact rebased-head Nix quick/build validation
is pending.
The later full test suite exposed two Czech lookup assertions that timed out
while the lazy catalog was loading. A pinned Node 24.21.0 focused run
reproduced both failures without suite load; warming the real Czech catalog
before the assertions passed all ten lookup cases with the original timeout.
The test setup now does that without changing application locale behavior.
The sandbox checks used cached Node and direct scripts because npm and the
locked Nix shell are unavailable there. Pinned live API and browser checks
remain open. No push, deployment or backend change occurred.

## 2026-09-27 - Require validated BFF bootstrap in the production frontend

**Request / reason:** optional runtime scripts and a best-effort session probe
could mount the frontend with stale standalone credentials when a production
BFF response was absent or invalid. The new preview needs its own explicit
build mode and an early failure path before any application query runs.

**Change:** the production build selects `VITE_RUNTIME_MODE=bff`, requiring
same-origin `/config.json` followed by `/session.json`. Both responses use
no-store credentials, reject redirects, wrong MIME and invalid shape, and are
bounded to 64 KiB and one 15-second deadline including body reads. A validated
snapshot replaces the runtime object and clears old standalone OAuth tokens.
An anonymous BFF result also clears impersonation. The early English/Czech
failure screen offers a GET-only retry and exposes only a fixed failure class.
Explicit standalone builds and local development retain optional scripts.

**Identity / compatibility:** API-issued impersonation tokens remain in session
storage but acquire a noncredential BFF session fingerprint. On BFF builds an
old, malformed, unbound or mismatched record is ineligible and cleared; a
matching record survives reload and OAuth token rotation. A token creation
result that arrives after the base login changes cannot be attached to the new
login. New records become active only after navigation and a fresh bootstrap.
The token provider uses `X-HaveAPI-Auth-Token`; BFF OAuth continues to use its
configured OAuth header. Standalone custom-provider headers retain their
existing behavior. The BFF must be upgraded before BFF-mode frontend assets.
No deployed host, API, map call or NixOS module changed. Browser state cleanup
does not revoke the separate API token in another active tab.

**Localization / verification:** the locked vpsAdmin terminology input read for
this change is `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The early
English/Czech copy received the lead's wording pass. Focused bootstrap,
impersonation, header and compatibility tests passed (6 files, 80 tests).
Typecheck, lint (1,633 files), design-doc audit (17 docs, 67 requirements,
256 routes, 63 API modules), i18n audit (8,164 keys in each language),
structural audit (44 raw findings, 43 accepted exceptions, no unaccepted or
invalid entries), UI-string audit and mutation audit (219 calls, no warnings)
passed on cached Node 24.19.0. The sandbox could not enter the pinned Nix
shell, so a locked-toolchain build and full quick gate still need a normal
environment run. No browser, CI, push or deployment was performed.

## 2026-09-27 - Add the BFF runtime configuration contract

**Request / reason:** the production frontend needs a mandatory public JSON
bootstrap while keeping existing `/config.js` users working. The BFF also
accepted permissive numeric parsing and implicit production defaults for
canonical origin, revoke URL and session state.

**Change:** generate one validated public object with schema version 1, serve it
as bounded `/config.json`, and project its API and WebUI fields through the
existing JavaScript endpoint. Both config routes retain no-store, nosniff and
same-origin resource policy; neither carries session state or secrets. Production
mode validates explicit origin, API/provider/recovery/redirect URLs, version and
HaveAPI fields, secret strength, exact bounded integers and writable file-session
storage before listening. It requires a revoke URL and matching OAuth provider
origins. `legacy-test` must be selected explicitly for historical local fixtures;
there is no production fallback. Token-provider error bodies are discarded from
the callback error path; diagnostics retain only a failure class and HTTP status.
Trust forwarded proxy headers only from loopback. The cookie, one-use state,
refresh/logout queue and `/session.json` shape remain unchanged.

**Compatibility / next:** `/config.js` remains available for existing clients;
the new JSON endpoint is additive, and the subsequent production frontend build
requires it. Deploy the BFF before that frontend. The later NixOS module and
site runbook must set `BFF_RUNTIME_MODE=production`, `PUBLIC_ORIGIN`, the other
explicit public settings and runtime secrets, and provide the writable state
directory. No configuration module, frontend bootstrap or deployed host was
changed in this BFF-side update.

**Verification / limits:** pure runtime-config and security tests pass on cached
Node 24.19.0, including positive/negative startup validation and redacted
errors. Offline `npm ci` in `bff/` succeeded. The implementer sandbox could not
bind loopback (`listen EPERM`), so the session lead ran
`nix develop --command npm run test:bff` in the normal environment against the
BFF contract worktree: all 46 BFF tests passed, including HTTP config projection,
provider redaction and session concurrency. Root lint, typecheck and design-doc
audit passed locally. No browser, CI, push or deployment was performed.

## 2026-09-27 - Accept the exact inherited structural ledger

**Decision:** the session lead matched all 43 exception hashes to adoption source
revision `e7ce3d73e799fc60e5933fe23bdb3a979eb4d6b9`,
confirmed 41 distinct paths and no duplicate path/rule, then accepted this
exact inherited ledger. Its review marker now records that decision. Correct the
MonitoringEventsPage rationale to say the adoption source already exceeded the
older line baseline by one; the adoption commit did not edit that file. The
source hashes and allowances did not change.

**Verification / status:** `audit:structural` passes with 44 raw findings,
43 accepted exceptions, zero unaccepted/invalid entries and zero aggregate
failures. Focused structural audit tests pass. `ci:quick` still stops at
`env:locked` in this sandbox: cached Node 24.19.0/npm 11.17.0 differs from
the required 24.21.0/11.19.0. The lead will rerun that exact command in the
normal Nix shell. No push, CI, browser suite or deployment was performed.

## 2026-09-27 - Disposition inherited structural debt and test UI fixtures

**Request / reason:** the deterministic verification update left `ci:quick` red
on structural debt inherited at the adoption source revision and three
UI-string findings in TSX test fixtures. The old structural console
output truncated findings and could not support an exact debt review.

**Change:** keep `scripts/fixtures/structural-baseline.json` unchanged. The
structural audit now writes every per-file and aggregate rule with old, current
and excess values to `work/audits/structural.json`, separating raw findings,
accepted exceptions and failures. A distinct ledger proposes 43 exact rule
exceptions across 41 source files byte-identical to adoption revision
`e7ce3d73e799fc60e5933fe23bdb3a979eb4d6b9`, a SHA-256 content hash,
allowance, rationale, owner and removal condition. The ledger review is pending,
so these entries cannot make the gate green until the lead accepts them.
Changed, deleted, resolved, duplicate and spare-capacity entries fail. Remove
redundant casts from two API test files and an extra blank line in the dataset
list, clearing three small
per-file findings. Classify only `*.test.tsx` as UI-string fixtures; product TSX
remains scanned. The three fixture findings are gone without changing product
copy.

**Verification / status:** the structural command reports 44 raw findings
(43 proposed per-file exceptions and one aggregate), zero invalid entries,
43 unaccepted per-file findings and one aggregate failure while review is
pending. UI strings report zero findings. Focused structural/UI script tests,
11 affected API wrapper tests, typecheck, lint,
design-docs audit (17 docs, 66 requirements, 256 routes, 63 API modules) and
mutation audit passed using cached Node 24.19.0. `ci:quick` stops at its
deliberate toolchain check because this sandbox lacks the locked Node 24.21.0 /
npm 11.19.0 shell; its full sequence needs a normal Nix environment run. The
lead must review the exception dispositions and record acceptance before the
structural gate can turn green. No production build, browser suite, CI, push,
default-branch write or deployment was done.

**Next / limitations:** remove ledger entries as their rules resolve. The extra
cast in `ResourcePackageDetailPage.tsx` shares a file with 73 lines of inherited
growth; its paired type and section extraction remains a page-refactor
follow-up. Local source checks and an accepted ledger are not release
certification.

## 2026-09-27 - Prepare deterministic verification lanes

**Request / reason:** the design audit depended on Git index state and failed
for an archive/Nix source. PR checks omitted several architecture audits and a
production build; one script test launched Chromium inside the nonbrowser suite.

**Change:** enumerate regular Markdown, TypeScript and CSS source files in sorted
order, including unstaged files, while pruning generated directories and
rejecting source symlinks. Keep link, requirement, inventory and external redesign
checks. Split the browser script regression into its own bucket without changing
its redirect/write-replay assertions. The Playwright wrapper uses the installed
1.61.0 CLI only after comparing its package, lock and version file. `ci:quick`,
the nonbrowser suites, production build, browser script and independent desktop/
mobile PR jobs now have explicit scripts/workflow jobs. No retry limits, failure
assertions or historical deployment automation changed.

**Toolchain and workflow references:** locked Nix Node 24.21.0 supplied npm
11.19.0 when measured locally; the [official Node archive](https://nodejs.org/en/download/archive/v24.21.0)
lists the same pair. The four Ubuntu workflows use the official
[checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1),
[setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0)
and [upload-artifact v7.0.1](https://github.com/actions/upload-artifact/releases/tag/v7.0.1)
tags checked on this date. `setup-node` v7 requires runner 2.327.1 or later;
the workflows use GitHub-hosted Ubuntu.

**Verification / status:** archive/checkout design-audit fixtures and the real
checkout audit passed, as did wrapper/version and bucket tests and YAML parsing.
The cached Node 24.21.0 store path disappeared before final checks; the exact
toolchain gate rejected cached Node 24.19.0/npm 11.17.0 as expected. Recheck its
positive path in the normal Nix environment.
The production build, browser script, PR matrix and remote CI have not run for
this candidate. `ci:quick` remained red pending structural debt disposition:
the structural audit reported 892 casts and 63 files over 500 lines against
its unchanged 1,156/53 baseline;
UI-string audit finds three strings in two test fixtures. No debt ledger or broad
page refactor is included. No push, default-branch write or deployment occurred.

## 2026-09-27 - Validate literal locale catalogs and rendered IP counts

**Request / reason:** REQ-009, REQ-010 and REQ-053 need dependable catalog and
mobile label checks. The old single-quote key scan could miss double-quoted
entries and silently accepted overwrites. The mobile VPS network card supplied
`n` to a message requiring `{count}`.

**Change:** use the TypeScript parser on every English and Czech locale module
before barrel spreads. Reject duplicate keys and unsupported dynamic catalog
entries, then compare keys, placeholders and plural groups. Remove the obsolete
`mailer.recipients.fields.label` definitions from both common modules; the mailer
field keeps its contextual Label/Popisek wording. Supply `count` in the mobile
network card. Fixture tests cover catalog failures, and a rendered test uses the
real en/cs dictionaries for the IP count.

**Terminology source:** `vpsadmin` flake input revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; the Nix store source read for
`docs/i18n-cs.md` and `docs/agent-instructions/localization.md` hashes to the
exact `flake.lock` narHash `sha256-mT3f1aRybGtZIQYRrHHEjdTp5foxhmAWu4KJogZ48Rk=`.
Direct `nix eval` was blocked by the sandbox daemon socket; the lead had
independently evaluated the same locked revision in the normal environment.

**Verification / status:** focused catalog audit, script fixtures, rendered
en/cs test and typecheck passed on cached Node 24.19.0. No browser suite, push,
default-branch integration or deployment was performed. Product copy beyond the
duplicate remains for the later editorial pass; this is local source evidence.

## 2026-09-27 - Prepare canonical WebUI repository and locked reference

**Request / reason:** adopt the upstream WebUI in `vpsfreecz/vpsadmin-webui` for
a parallel NixOS preview at `newadmin.vpsfree.cz`. The maintainer selected one
frontend and one BFF process on one VPS and directed that the existing
OpenStreetMap/Nominatim call remain unchanged.

**Change:** preserve upstream history through `e7ce3d73e799fc60e5933fe23bdb3a979eb4d6b9`;
rename the private npm package identities; add a flake development shell and a
locked `vpsadmin` input at the site services revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Repository instructions now
resolve the Czech terminology guide from that evaluated input. The handbook
distinguishes canonical source ownership from historical Clankerdev deployments.
The new NixOS packages, runtime bootstrap and site configuration will be
implemented separately.

**Verification / status:** on cached Node 24.19.0, `env:check`, lint,
`typecheck`, the production build and `audit:active-docs` passed. Nix syntax,
`nixfmt --check`, lock-graph metadata parsing and whitespace checks passed.
The npm lockfile identities match their manifests. The pinned vpsAdmin revision
contains both guide paths. These are local source checks, not a Nix package
build or deployed-service test. No default branch, host activation, DNS change,
OAuth client or deployment was created. The upstream `UI_REDESIGN.md` index
and its audit rules remain intact.

**Next / limitations:** the sandbox cannot contact the Nix daemon or GitHub, so
it could not generate the new lock online, enter `nix develop` or evaluate the
pinned guide through the flake. The lock graph uses the existing site lock's
hashes and exact service revision and needs a normal-environment evaluation.
`audit:design-docs` also could not finish here: Node's Git child process reports
`EPERM` despite a zero Git status. Run it in a normal environment before review.

## 2026-09-27 - Repair PR525 documentation audit test fixtures

**Failure:** CI run 36333825895 failed three script tests. The updated audit
requires the root redesign index and scans Git-tracked paths; the isolated test
fixture supplied neither. The failure reproduced locally. The earlier direct
audit checks passed against the real checkout but did not cover this fixture.

**Fix:** include the index and initialize/stage the temporary fixture repository.
Keep the audit strict. Add cases proving that valid bridge links and historical
mentions pass, external references in docs/source fail, and broken links inside
the bridge fail. Existing inventory and requirement checks remain in place.

**Verification:** all seven focused documentation tests passed. The full local
`npm run ci:pr` passed: audits/lint/typecheck, 138 script tests, 36 BFF tests and
1,514 unit tests. No runtime or deployment change.

## 2026-09-27 - Repair missing redesign-spec references

**Request:** make the referenced UI_REDESIGN.md available to repository readers.
The original external file was not found in the available workspace or Clankerdev
Git history. Its precise contents remain unknown; the existing design handbook
is the maintained replacement, not a reconstruction of the missing document.

**Change:** add a root compatibility navigation page; replace external pointers
in historical stubs and source comments with in-repository documentation. Mark
the March route audit as historical and replace unverifiable numbered citations
with related current workflow links. Include the previous sidebar release receipt.

**Verification / status:** 121 local links/anchors checked; design and active-doc
audits and diff whitespace validation passed. A negative check confirmed the audit
rejects a restored external sibling reference. No runtime behavior change or
deployment needed.
Prepared for review. Historical requirements are not claimed to be fully recovered.

## 2026-09-27 - Revised sidebar approved, merged and deployed

**Authorization / scope:** the maintainer approved deployment and testing of the
revised [PR522](https://github.com/Kerrycek/clankerdev/pull/522). The normal 256px
sidebar, full labels and groups remain intact; destination icons are distinct.
The withdrawn 176px proposal was not released.

**Release:** PR522 merged as `49c6a51d0b32c4a6d5dd1df426e0bac1d8066115`.
Both dev.crucio.cz and clankerdev.vpsfree.cz serve that frontend and matching BFF.
The merged tree equals the approved `ceed0e44` tree. The exact dev-built artifact
was promoted to the public host. Health, provenance and anonymous session checks
passed on both hosts. Previous runtime `92f96896` and rollback backups remain
available; no API, database, DNS or secret configuration was changed.

**Verification:** [static CI](https://github.com/Kerrycek/clankerdev/actions/runs/36331560750)
passed, including 1,514 unit, 135 script and 36 BFF tests.
[Browser CI](https://github.com/Kerrycek/clankerdev/actions/runs/36331560738)
passed 681 cases (378 desktop and 303 mobile). After deployment, 40 synthetic
fixture cases passed across both hosts: dashboard/preferences/mobile navigation
and user/admin, cs/en, light/dark sidebar checks, including 256px width, labels,
groups, distinct icons and collapse/expand behavior. Eight separate real anonymous
browser checks passed across both hosts, cs/en and desktop/mobile, with no page
errors and matching favicon bytes. These are not live authenticated lifecycle
certification. Screenshots and detailed receipts remain operator-held evidence.

**Status / next:** deployed and verified. PR496/507/509 and backend44 remain
excluded; autonomous development stays paused. This documentation-only follow-up
records the completed release for inclusion in the next documentation update.

## 2026-09-27 - Keep normal sidebar width; revise PR522 to icons only

**Request / reason:** the maintainer already uses the full labeled menu and does
not want it narrowed. The previous 176px compact preview over-interpreted the
shared feedback about icons and labels.

**Change:** PR522 now preserves the existing 256px expanded sidebar, full cs/en
labels, group headings, mobile drawer and optional collapse behavior. Withdraw
new compact widths and abbreviated translations. Keep distinct destination icons,
explicit accessible link names and decorative icon hiding. Update REQ-004,
product design and DEC-011 to record the superseded proposal. Include the earlier
release receipt in this documentation update instead of creating another PR.

**Verification:** typecheck, lint, design/active-doc audits, build, 9 existing
sidebar unit tests and 12 desktop/mobile dashboard/preferences fixture cases
passed. Eight synthetic user/admin, cs/en, light/dark previews confirmed a 256px
normal sidebar, visible labels/groups and distinct icons. Czech dark admin preview
was visually inspected. Preview images remain operator-held evidence.

**Status / next:** revised for review; not merged or deployed. Earlier narrow
sidebar screenshots describe the withdrawn proposal, not this revision.

## 2026-09-27 - Approved heatmap and favicon release

**Authorization:** the maintainer approved PR521, PR523 and PR524 for merge and
release. PR522 is explicitly held for visual review; PR496/507/509 and backend44
remain excluded. The proposed webui.vpsfree.cz alias was canceled before changes.
Scheduled autonomous development remains paused.

**Runtime release:** PR521 and PR524 were merged after their exact-head CI passed.
Both dev.crucio.cz and clankerdev.vpsfree.cz now serve frontend and matching BFF
`92f968960bec47d19eca78b47db219969fecc3ed`. The public host uses the exact dev-built
frontend artifact. Sidebar, backend/API configuration and secrets are unchanged.
Documentation PR523 is tracked separately and requires no runtime redeployment.

**Verification:** the integrated approved candidate passed 1,514 unit, 135 script
and 36 BFF tests, typecheck, lint, translation/CSP/documentation audits and build;
16 targeted desktop/mobile cs/en heatmap fixture cases passed. Favicon PR CI
passed 378 desktop + 303 mobile cases. After deployment, 22 fixture browser cases
passed on each host (44 total). Eight actual anonymous browser scenarios covered
both hosts, cs/en and desktop/mobile: favicon bytes match the legacy image,
root/deep routes resolve the icon, provenance matches and no page errors occurred.
Public clankerdev node actions contain only icons with accessible labels/tooltips;
the dev public API did not expose heatmap actions, so its action behavior is covered
by fixture evidence. Health, anonymous session and authentication endpoints passed.
No private API mutation or real VPS lifecycle action was used for these checks.

**Rollback:** matching previous release `fd290b5ec1b22900e704e8cb990c5ba050af2394`
is retained on both hosts together with private webroot/config snapshots. Restore
that matching frontend/BFF pair and recheck provenance/auth/health if needed.
Detailed scripts and receipts remain operator-held; see the handover limitations
in [Operations](docs/design/OPERATIONS.md).

**Status / next:** runtime release complete. Documentation PR523 passed all
378 desktop + 303 mobile CI cases and was merged as
`7e97d2919f908b175b6f8bc5b7ff899f1f59cec4`. Its changes are documentation and
development audits only; runtime source is identical to deployed `92f96896`,
so no second runtime deployment was needed. Retain the explicit PR522 review
hold and the excluded cursor/backend work. This follow-up receipt is maintained
on a separate documentation branch for the next reviewed documentation update.

## 2026-09-27 - Repository-contained design and requirements handbook

**Request:** provide complete English design documentation in docs/, including
recoverable maintainer requirements, what exists, why, how decisions evolved,
and a maintained current list for handover.

**Change:** expanded the existing documentation PR
[#523](https://github.com/Kerrycek/clankerdev/pull/523) instead of creating duplicate
setup work. Added the [handbook](docs/design/README.md), 66 stable requirements
with source/acceptance/status, product and workflow design, architecture, API
contracts, decision history, verification gates, operations and source limitations.
The previous specification pointed outside the repository to an unavailable
UI_REDESIGN.md; current entry points now resolve inside the repository. Historical
fragments remain classified as archaeology, not competing requirements.

Added generated inventory of 256 route entries (including layouts/index routes)
and 63 API adapter modules. CI now checks inventory drift, handbook link targets
and requirement references. AGENTS.md requires updates with relevant behavior
changes. Inaccessible history, unverified legacy parity, incomplete live lifecycle
certification and private operational handover remain explicitly identified.

**Verification:** docs inventory/links/IDs and active-doc audits passed; all 135
script tests passed, including 4 new checks of inventory extraction, drift, broken
links/requirement references and unresolved imported route groups. No product
runtime change; no live mutations or deployment performed.

**Status / next:** prepared for review. Review the recovered requirement intent,
assign owners to open decisions/evidence gates, and retain ongoing updates.
The documentation does not complete the independent audit or authorize a beta.

## 2026-09-27 - Reuse the legacy favicon

**Request:** bring the old UI favicon into WebUI Next.

**Change:** [PR #524](https://github.com/Kerrycek/clankerdev/pull/524), commit
`77a978e3`, copies the legacy 48x46 PNG unchanged to `public/favicon.png` and adds
an explicit root-relative favicon link in `index.html`, including nested routes.
The original legacy UI asset is unchanged.

**Verification:** production build passed; emitted HTML includes the link and
byte comparisons confirm the built PNG matches the source and legacy image.

**Status / next:** prepared, not merged or deployed. Review CI before release.
This entry is maintained in the pending work-log PR #523 so the favicon PR can
remain independent of the documentation setup.

## 2026-09-27 — Work log established

**Request:** keep an ongoing record to support a complete project handover.

**Change:** introduce this log, link it from the main README, and add a maintenance
rule to AGENTS.md. Seed it with the verified recent release and the two current UI
PRs. Older development is still available through Git/PR history; it has not been
invented or silently marked complete here.

**Verification:** documentation diff and local link checks. No runtime change.

**Status / next:** documentation prepared for review. Maintain entries with future
work and merge/deployment outcomes. Full handover documentation and an independent
code audit remain separate work; creating this log does not complete them.

## 2026-09-27 — Distinct sidebar icons and readable compact navigation

**Request:** remove duplicate menu icons and keep navigation understandable through
short visible labels.

**Change:** [PR #522](https://github.com/Kerrycek/clankerdev/pull/522), commit
`4e287bd0`, replaces repeated symbols with destination-specific icons. The compact
sidebar is a 176px labeled list instead of a 64px icon rail. Long destinations have
short Czech/English labels; full names remain in accessible names and tooltips.
The expanded sidebar stays 256px and mobile keeps its labeled drawer.

**Verification:** typecheck, lint, translation audit, build, 9 existing sidebar unit
tests, and 10 desktop/mobile dashboard and settings-persistence browser cases
passed. Eight synthetic visual previews covered user/admin, cs/en and light/dark:
no clipped compact labels or duplicate icons. Czech dark admin preview visually
inspected. Preview images and browser/build logs are local operator evidence,
not yet archived in repository CI artifacts.

**Status / next:** PR prepared; not merged or deployed. Review the intentionally
wider compact mode and CI before considering release. No permission/API changes.

## 2026-09-27 — Icon-only node heatmap actions

**Request:** show only the heatmap icon in each node row instead of repeating
“Heatmap” / “Heatmapa”.

**Change:** [PR #521](https://github.com/Kerrycek/clankerdev/pull/521), commit
`a589cad3`, removes the button text in public/member/admin lists. Localized tooltip
and accessible name still identify the heatmap and its node.

**Verification:** typecheck, lint, build, and 16 existing Chromium desktop/mobile
heatmap fixture cases passed, covering cs/en, opening/closing the dialog,
eligibility, and missing configuration. Assertions now verify an icon-only control
with its accessible name and tooltip.

**Status / next:** PR prepared; not merged or deployed. Review CI before release.

## 2026-09-27 — Preferences, console, and deletion release

*Retrospective entry from recorded release evidence, checked against GitHub on
2026-09-27. Deployment describes the completed release, not a continuous health
or provenance guarantee.*

**Request:** merge, deploy and test the prepared fixes, including persistent dark
mode, on dev.crucio.cz and clankerdev.vpsfree.cz.

**Changes merged:**

- [#517](https://github.com/Kerrycek/clankerdev/pull/517): open a console session
  on entering the console page, with bounded/deduplicated token creation and
  explicit failure/replacement behavior.
- [#518](https://github.com/Kerrycek/clankerdev/pull/518): admin soft/hard VPS
  deletion options, optional custom retention, and persistent accepted-request
  feedback linked to Tasks. Member deletion keeps its normal API path.
- [#519](https://github.com/Kerrycek/clankerdev/pull/519): save UI preferences via
  the keyed settings PUT endpoint, fixing theme persistence after a new login.
- [#520](https://github.com/Kerrycek/clankerdev/pull/520): update stale nightly
  power-action/forecast browser assertions without weakening runtime safeguards.

**Release:** `fd290b5ec1b22900e704e8cb990c5ba050af2394` was deployed to both hosts.
Its tree matched the tested integrated candidate. Frontend and BFF provenance
matched; existing configuration was preserved, with no API/database migrations.

**Verification recorded:** 1,514 unit, 131 script, 36 BFF tests; typecheck, lint,
translation/CSP audits and build passed. Targeted checks passed (180 Chromium and
16 WebKit). Full integrated PR smoke passed (378 desktop + 303 mobile = 681).
After deployment, 32 targeted Chromium fixture cases on each host plus 16 public
WebKit fixture cases passed. Actual anonymous provenance, health, session and auth
endpoint checks also passed on both hosts. No real VPS deletion or personal
preference mutation was used for browser regression tests.

**CI correction:** historical run
[36274080869](https://github.com/Kerrycek/clankerdev/actions/runs/36274080869)
failed because four test guards still expected the old settings path. Exact
method/path guards were corrected; replacement run
[36276637276](https://github.com/Kerrycek/clankerdev/actions/runs/36276637276)
passed 674 cases. The old failed run remains in history.

**Rollback:** previous release `2eef5193403258c88ec4fca79138898aaf4273cc` and
operator backups were retained. Restore the matching previous frontend/BFF release
using the [deployment documentation](deploy/README.md), then verify provenance
and auth/health checks.
Private backup locations and full release logs remain in the operator handoff;
they must be transferred securely for an operational handover.

**Known limitations / follow-up:** the dev API lacks the default VPS soft-delete
retention for its environment. A retention policy must be chosen before changing
shared configuration; the UI release did not resolve that API configuration issue.
An intermittent list-pagination issue from earlier nightly evidence is not claimed
fixed. Cursor PRs #496/#507/#509 and rejected backend PR #44 were excluded from
this release. Scheduled autonomous development remains paused.

## 2026-09-30 — Private IPv4 assignment availability

See the [per-change investigation and verification record](docs/work-log/2026-09-30-private-ip-assignment.md).

## Entry template

Copy this structure for the next meaningful update; remove unused fields.

```markdown
## YYYY-MM-DD — Short description

**Request / reason:** ...
**Change / decision:** ...
**References:** PR, commit, issue, runbook, or CI links.
**Verification:** commands/results, tested revision, and fixture/live scope.
**Status:** prepared / merged / deployed / blocked (state the target/revision).
**Next / limitations:** concrete remaining step, risk or required decision.
```
