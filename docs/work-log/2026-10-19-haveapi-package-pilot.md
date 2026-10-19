# Injectable HaveAPI package pilot — 2026-10-19

## Scope and implementation

REQ-007, REQ-011, REQ-012 and REQ-059. The approved HaveAPI TypeScript/Promise
client work includes proving package fit in the React WebUI. This change adds an
injectable structural request client while keeping the production fetch default,
root dependency/lockfiles and Nix hashes unchanged. It is based on canonical main
`7860521f30826c3886c89c35e8ab6f4e082e0a4b`, on `dev/haveapi-async-client`.
No merge, publication or deployment is claimed.

The shared WebUI session/result policy is retained. Fetch query/body preparation
moves to its own transport, resolving the old file's structural line-budget
exception. The candidate adapter delegates wire handling to the injected client
and preserves existing error classification, same-session read renewal, original
request language, mutation non-replay and action receipts. The
[design/verification guide](../design/HAVEAPI_PACKAGE_PILOT.md) describes the
boundary and later command.

The dedicated runner snapshots a committed WebUI ref, freezes candidate bytes,
installs only into an owned temporary copy and records source claims, tar hash,
tool versions and results. Candidate-only type/Vite/browser fixtures stay outside
normal application checks. Adapter Chromium cases cover read/mutation/recovery,
identity and abort/receipt behavior. Separate Chromium/Firefox/WebKit script-tag
fixtures exercise both clients through native XHR with synthetic envelopes.

## Local evidence and limits

The locked Nix environment supplied Node 24.21.0 and npm 11.19.0. Dependency setup
completed. Application/tooling typechecking and 59 focused existing/new adapter tests
passed. Thirty selected script regressions passed, including three new runner
isolation/provenance tests. Scoped lint/format, Tailwind/pattern checks, design
docs/inventory and structural audits passed. The seven browser cases list
correctly; the candidate fixture compiles against the peer committed generated
declarations via a temporary source preflight. This is separate from the later
check against the installed tarball. Two initial fake-refresh cases omitted JSON content type and failed the
existing guarded BFF response contract; correcting those synthetic responses
made the focused suite pass. No declared Git hook framework is present.
Final source and review evidence accompany the commit.

The selected HaveAPI pack-owner receipt identifies committed source
`ae0fe39738c3eb10019377d0fce95dc249cdfd16` and candidate SHA-256
`46fd526ac02d04fdbc9526c7b7e67cdde0a5cfe730cf865702a4a2b4167bf991`.
The local tar has no `gitHead`; the later command must carry the explicit source
assertion. This records the intended candidate, not a completed package pilot.

The actual packed declaration/browser proof, three-engine provisioning and full
integration remain deferred until committed-deliverable review. Existing VM
loader checks are distinct from real-browser evidence. Synthetic fixtures do
not certify real API permissions, OAuth exchange, task completion or production
readiness. Next: finish quick gates, review the committed change, then run the
isolated proof under the verification watcher and retain its receipts.

## Follow-up: preserve the locked graph during candidate installation

The first committed-candidate run used WebUI `e35f2720` and the remedied HaveAPI
source `dc94157808966c12418b4009085fec237a869789`, tar SHA-256
`de55212e85ceb2bceac77e249272e20e1062afa8aa733df42e02eae981c094b8`.
All 301 WebUI unit files passed (1,867 tests), and the production build passed.
The package proof stopped before browser assertions: `--package-lock=false`
let the no-save install change 96 packages, including Playwright 1.61.0 to
1.64.1. The pinned runner correctly refused that version. The declaration and
Vite steps used the drifted graph and are diagnostic evidence only. The failed
snapshot and log remain in local session evidence.

One npm-only feasibility probe in a fresh committed snapshot enabled lockfile
reading with `--package-lock=true`. It preserved all 407 installed baseline
package names/versions and the manifest/lock byte hashes while adding the
candidate. Structured before/result records and a separate read-only comparison
confirmed this result. The watcher failed to save its requested console
transcript; that evidence gap is recorded, and the probe was not repeated.
No compiler or browser launched during the probe.

The runner now uses that command and checks the existing installed locked graph
and manifest/lock files before any consumer tool. Focused regressions cover
version/name/presence drift and file tampering while allowing added candidate
paths and absent platform-optional packages. Root dependencies and lockfiles
remain unchanged. The actual declaration/Vite/browser proof must run again on
the new committed runner; the successful full unit/build result is retained for
this runner-only correction.

## Follow-up: preview command directory

The next committed proof at WebUI `7c9e2696` retained all 407 locked baseline
packages and passed the actual tarball declaration compile and Vite 7.3.5 build.
It stopped before browser assertions because Playwright started the preview
command from the nested config directory, where the root Vite executable path
did not exist. The failed snapshot, result, log and exit status are retained.

The dedicated config now explicitly starts preview from the snapshot root.
A browser-free regression loads the actual config and verifies that its working
directory resolves both the Vite executable and config paths. The port, browser
matrix, strict startup and no-server-reuse rules are unchanged. A fresh committed
package proof is still required; no browser success is claimed by this fix.

## Follow-up: fixture runtime mode

The proof with HaveAPI `76f190f9` passed the installed declarations, minified
Vite build and ordinary UMD scenarios in Chromium, Firefox and WebKit. All four
adapter scenarios reached the fixture but failed before API dispatch: the
dedicated production build omitted `VITE_RUNTIME_MODE`, which the application
correctly requires. The failed snapshot, result, traces, log and exit status
are retained.

The dedicated Vite config now explicitly selects `bff`, matching the normal
production build. A browser-free regression loads that config and checks its
value with the application's production runtime-mode resolver.

The fixture treats its synthetic session identity as already validated. Its
helper now binds that key before remembering the same-origin session, using
the production functions and ordering. Before its first API call, each adapter
case checks the real runtime OAuth2 token, both session keys and unchanged
runtime identity. A browser-free gate also checks that the real BFF auth guard
rejects an unbound token and accepts this fixture binding. Binding happens once;
refresh and changed-session behavior continue through the existing policy.
This is not OAuth or BFF bootstrap certification. The application guard and
authentication policy remain unchanged. Adapter fit and the final engine-version
receipt still require a successful committed package proof.
