# Administrator backup cleanup

The requested cleanup removes all selected primary/hypervisor snapshots, including
manual snapshots, while retaining backup-pool history under normal retention.
It remains distinct from ordinary plan removal, which leaves snapshots on both
primary and backup pools. This change extends REQ-011, REQ-024 and REQ-048.

## Implementation and compatibility

The shared dataset plans page explains plan removal beside the list and inside
its removal confirmation for every existing authorized plan user. The VPS root
disk card links to the existing dataset plans route, preserving `/app` or
`/admin` context and selecting the existing-subtree scope.

The cleanup form appears directly after the assigned plan list or its empty
state. It has one concise explanation and no opener or modal. Recursive scope is
a local checkbox that starts unchecked regardless of URL hints and never changes
page filters. Fresh forms and dataset/URL-context changes restore recursion off,
preservation on and confirmation unchecked. The separate Confirm checkbox starts
unchecked and is required by both the submit button and handler. Acknowledgement
resets on dataset/recursive-scope changes and accepted submission, independently
of both options. The client submits one ordinary mutation with only `recursive`
and `backup_first`, then delegates its action-state receipt to the existing task
controller and local mutation lock. Request acceptance is pending, never proof
of completed cleanup. The task controller observes failures and completion and
refreshes the affected dataset. Accepted work continues after browser exit.

Known construction rejection remains in context for deliberate correction/retry.
Unknown submission outcomes or missing receipts retain the ordinary durable
uncertainty guard; task inspection and fresh reads precede explicit acknowledgement.
Failed chains may have partly changed plans, heads or snapshots;
inspect ordinary task results and current storage before deliberate retry.

The adapter calls the actual generated `dataset.disable_backups` method and uses
its generated two-boolean input type. Initial local verification used the packed
SDK candidate from `6d4941bbf617a0d1e1c131a2bf14ca6476389809` (archive SHA-256
`671b54f52da297cd465c1b7516841a859c84099ab30d776e5086802559d19a10`) through
the repository's documented no-save override. Its local version 0.6.0 is distinct
from the published registry 0.6.0 input, which lacks this action. The candidate was
exported from final API `50aa37aede8926965598f4f8fb0782dce377afb6`. Earlier
export equivalence and complete candidate/input identities are retained in
session evidence.

The final manifest and lock select published SDK `0.7.0`, as recorded below.
Initial verification retained the earlier registry 0.6.0 packaging inputs, followed
by the local development archive. No handwritten generated member or endpoint bypass is introduced.
The first no-lock override changed unrelated local dependencies; restoring
`npm ci` and installing with `--no-save --package-lock=true --ignore-scripts`
kept every non-SDK installed entry at its exact locked version/resolution/integrity.
All 1,392 SDK files matched the verified archive. At that stage the manifest and
lock were unchanged. Those results cover the installed development overlay,
not a registry release or the Nix package's dependency acquisition.
API/scheduler deployment compatibility remains separate.

The locked terminology source is vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. English/Czech product copy is supplied
by the lead; recursive Czech text uses the locked term “vnořené datasety”.

## Verification and KB impact

Generated SDK, adapter, component and mounted-page checks passed 64 tests across
five files, including real HaveAPI serialization, explicit false/recursive input,
exactly one POST, empty dataset plus action-state receipt, missing receipt,
admin/capability/planless entry and ordinary uncertainty handling. Source includes
bilingual browser fixtures and desktop/mobile capture steps, plus app/admin VPS
plans-link assertions. Post-review verification passed 379 unit-test files with
2,586 tests, the development-candidate build and 34 desktop/mobile browser cases.
Four additional existing EN/CS cleanup cases passed with an HTML reporter to
persist their actual screenshots. Fixtures establish synthetic UI behavior;
they do not certify real API or storage behavior.
The E2E fixture is registered in the strict typecheck inventory.

Required quick checks, independent review, the accepted preflight-read correction,
consolidated history and exact check/capture evidence are recorded in the session.
The accepted intermediate feature was built and used for isolated development
review; this branch is neither published nor merged. Production deployment is
not claimed.

The canonical KB workflow was read in `vpsfree-kb-contracts`. Its current
`backups.vps.open` path and `backups/vps-backups` capture point to PHP sources;
they do not certify React UI behavior. Relevant backup pages are Czech
`navody:vps:zalohy`, `navody:vps:obnova_webu_zo_zalohy`, `navody:vps:exporty` and
English `manuals:vps:backups`, `manuals:vps:exports`,
`manuals:vps:vpsadminos:storage`. The legacy UI package owns its changed PHP
landmarks. No production KB writes or claims of refreshed screenshots were made.
The React dialog's synthetic EN/CS desktop/mobile captures and Czech VPS shortcut
crops were inspected after independent review. Longer Czech confirmation text
uses the existing scrollable modal body; the initial screenshots do not show its
last warning line. No scrolled-bottom visual is claimed.

No database migrations or backend sources are included. Publication remains held
by the lead. Implementer3 retains package and review-fix ownership. New uncertain
browser/build checks need a fresh watcher under the workspace monitor procedure.

## Development package with the retained local SDK

The user requested real React review against the session development cluster
without publishing the TypeScript client. At that stage the manifest and npm-generated lock
selected the unchanged 348603-byte candidate as
`file:packages/development-sdk/vpsadmin-typescript-client-0.6.0.tgz`. Its SHA-256
is `671b54f52da297cd465c1b7516841a859c84099ab30d776e5086802559d19a10`;
the retained development provenance records its npm integrity, SDK source and
actual API export. The local version
remains `0.6.0`, distinct from the earlier registry artifact. No SDK source was
regenerated, repacked or released.

The lock delta is limited to the root SDK selector and that package's resolved
archive and integrity. Every non-SDK record, the HaveAPI peer, XMLHttpRequest and
the BFF manifest, lock and hash remain unchanged. The regular archive is retained
in the cleaned source without weakening its symlink/private-file checks.
Frontend and BFF use the same final source and provenance.

The initial ordinary `prefetch-npm-deps package-lock.json` attempt failed once
with `invalid format` for the local archive URL; no aggregate hash was obtained.
The frontend therefore uses the selected nixpkgs' supported `importNpmLock`
alternative with its own `npmConfigHook`, `npmRoot = source` and one exact SDK
`packageSourceOverrides` entry pointing to the included archive. Registry modules
retain their individual lock integrity, as does the SDK record. This standard
importer needs no aggregate `npmDepsHash`; the BFF cache hash remains unchanged.
There is no custom cache, fetcher patch or integrity/checker bypass.

The [package guide](../design/PACKAGING.md#temporary-unpublished-sdk-input) describes
this development input and its verification boundary. Source checks and installed
method/type tests do not establish a successful Nix package
build or activation. Final committed review precedes the frontend/BFF and
provenance/source/package-content builds. Existing unit/browser results retain
their exact candidate scope; no unchanged full suite is required for this input
selection. Real HTTPS/OAuth/API review used separately owned runtime setup and preserved
that cluster's existing VPS, plan and snapshot data. This development input did not satisfy the published-SDK merge prerequisite;
the registry adoption below replaces it.

## Inline form and concise copy correction

After the accepted `ff2cf8ae` build and real admin/member OAuth smoke, the user
requested the cleanup form directly below plans, with the same concise text as
PHP. The cleanup-only opener and dialog were removed; unrelated plan dialogs and
shared controls remain unchanged. The form uses existing Card, Checkbox and
Button components. Removed identity/scope, backup-first help, no-new-snapshot and
opt-out prose are not moved to another surface. The single EN/CS explanation and
Confirm/Potvrdit label use the lead's exact approved copy. The plan-removal
explanation remains visible to existing authorized users.

Local recursive state starts false for every URL hint. Dataset/URL-context
changes reset recursion false, backup-first true and confirmation unchecked.
Editing recursion never changes the page URL. Backup-first remains
independent. Confirmation resets for dataset or recursive-scope changes and after accepted submission. Pending, duplicate-submit,
preflight/local-lock, one-call/task and unknown-outcome semantics are retained;
the uncertainty and rejection panels remain inline. The internal task label
still includes the dataset identity. There are no API, SDK, dependency, BFF or
shared-component changes, and no migrations.

Focused component/page tests cover exact bilingual content and absence of the
removed dialog/help, planless and assigned-list placement, local scope/defaults,
independent choices, button plus handler enforcement, scope/acceptance resets and
existing pending/receipt/uncertainty behavior. The existing browser fixture is
adapted to the inline form; no broad matrix is requested. Quick checks, committed
review, matching packages and later read-only EN/CS desktop/narrow runtime proof
remain separate gates. Prior package/capture/smoke evidence retains its original
source scope; the new visual proof must never submit cleanup or change the
persistent VPS1/plan/snapshot fixture. Terminology remains pinned to vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Unified cleanup defaults

The user requested only Backup first checked on every fresh entry, including the
existing VPS plans link. URL hints now only invalidate local form context and
never select recursive cleanup. Context changes reset all three options to
false/true/unchecked; deliberate local recursion and preservation opt-out remain
valid after fresh acknowledgement. Required confirmation, one mutation, preflight,
locks and receipt/unknown handling are unchanged. Product copy, routes, SDK and
packaging inputs are unchanged; there are no migrations. Focused tests cover all
URL-entry variants, dataset/context resets and deliberate explicit submission.
Prior deployed proof retains its source scope; matching packages and authorized
read-only proof remain separate gates.

## Published SDK adoption

The final dependency selection pins published `vpsadmin-typescript-client@0.7.0`
from SDK source `0f1cde21a6e3b64a06389d21a5a5124093520724`, tag `v0.7.0`.
The actual registry URL and SHA-512 integrity are in the npm-generated lock;
the archive SHA-256 is
`19fedf46dc72f902fedb055595d1b4de18af58d121bc9dd2ff6bc0234abdafdd`.
The [client contract](../design/HAVEAPI_CLIENT.md#generated-vpsadmin-typescript-sdk)
records the required action and declarations. No SDK regeneration or publication
is part of this WebUI change.

The local archive and development provenance file are removed from final source.
Historical refs, archive identities and verification receipts remain in session
evidence. The frontend keeps the standard `importNpmLock` and matching hook,
removing only its SDK source override. The npm lock changes only the root SDK
selector and SDK record; HaveAPI, every other dependency and the BFF graph remain
unchanged. UI behavior and product copy are unchanged, with no migrations.

Registry installation, installed declarations, ordinary action/wire checks and
quick verification must establish this input's own scope. Final package builds
and content/provenance checks follow affected committed-deliverable review;
old local-archive builds do not certify registry acquisition. Prior UI reviews
and nondestructive live proof retain their exact source scope. This adoption
does not activate a runtime or repeat the browser/VM matrix.
