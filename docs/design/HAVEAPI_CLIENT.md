# HaveAPI client dependency and provenance

The frontend imports `AsyncClient`, `AsyncError` and `RequestSpec` from the
published `haveapi-client@0.32.0` npm dependency. Authenticated, public and
fallback-description requests use this library through the WebUI policy in
[API contracts](API_CONTRACTS.md#production-haveapi-client). The package owns
XHR, request serialization and wire decoding; WebUI retains session renewal,
per-request authentication/language and receipt-preserving domain output narrowing.
The generated client owns operation paths, input validation, descriptions and exact
output namespaces; its complete RequestSpec passes through the shared policy.
See the [migration record](../work-log/2026-11-01-typescript-client-migration.md)
for candidate artifact inputs and verification. BFF session
and OAuth exchanges keep their separate implementation.

## Published source and artifact

The exact root dependency is `haveapi-client: "0.32.0"`.
[The provenance record](../../packages/haveapi-client-provenance.json) binds the
registry URL and npm SHA-512 integrity to the published SLSA provenance.
The parsed release workflow metadata identifies `refs/tags/v0.32.0` at HaveAPI
commit [`0e7166a0f8f15827bfac051666a53bf449e999ec`](https://github.com/vpsfreecz/haveapi/commit/0e7166a0f8f15827bfac051666a53bf449e999ec),
directory `clients/js`, and
[release run 41056909572](https://github.com/vpsfreecz/haveapi/actions/runs/41056909572).
The actual published archive has SHA-256
`144cf17ada3b4578c8a3d81c87d183c94bd72d98e83934475c019b8bfd8b2efc`;
its SHA-512 matches the registry integrity and attestation subject digest.
These are archive and parsed provenance checks, without cryptographic signature
verification. The package has no `gitHead`; its version alone is not source proof.

Use the actual npm archive for compatibility checks: 37 of its 47 dist files
differ from the release's checked-in dist. The package includes its MIT license
and bundled declarations at `dist/types/haveapi.d.ts`; its UMD main exports both
the callback and async APIs. The used `RequestSpec`, `AsyncClient.request` and
`AsyncError` declarations retain the adapter's request, abort, timeout and error
receipt interfaces. Installed-declaration checks and actual-library fixtures
establish the application compatibility boundary. The runtime owns wire decoding
across the complete RequestSpec/RequestResult boundary.

`package-lock.json` pins the release integrity and `xmlhttprequest@1.8.0` with
its exact registry URL/integrity. The library's upstream `latest` requirement
does not float during `npm ci`. Browsers use native XHR; the transitive package
provides the library's Node transport. The frontend uses the ordinary registry
`buildNpmPackage` dependency cache, described in [packaging](PACKAGING.md).

## Dependency updates and verification

Use the locked Node/npm toolchain in `nix develop`. For an intentional update,
inspect the npm metadata and attestation, verify its artifact digest and source
revision, update the exact dependency and lock together, and refresh the root
npm dependency hash. Preserve unrelated lock entries and the separate BFF graph.
Update the provenance record and this contract when the supported package changes.
`check-package-source.mjs` rejects disagreement between manifest, lock and
provenance, substituted archives and missing transitive transport integrity.
npm verifies the locked artifact bytes during installation; the source checker
does not itself verify registry signatures or perform network requests.

<a id="unpublished-generated-sdk"></a>

## Selected generated client development input

The root package temporarily selects the SDK-owned immutable HTTPS archive for generic
incident-policy discovery, per-VPS policy settings and saved report evaluations.
The [development provenance](../../packages/vpsadmin-typescript-client-development.json)
binds artifact commit 2d251bb0e10f5379a19df3a07eb7a0b0f19e3c88 to packed source
44c651b2a57e8de553dd51236c2dccbc09946fac. Its 345048-byte archive has SHA-256
983061ec981e24e45c25abeef81d8049d4253bad4d473ea37d5ce27ff0a1b718.
Package 0.4.0 is a development candidate, not a registry release. Standard npm ci
installs the self-contained compiled exports and declarations; ordinary Nix dependency
fetching needs no private checkout, generated shim or custom pipeline.

The generation input is API de4df3d63f4d4afb0c27e8b9be2785c15d24811c,
schema SHA-256 7cb28ebd8e0957d9a8ba2c359c8658040ed1cd195f0dd14327c03b595012fc85.
HaveAPI generator 1ef9b204ba45bb261d3334be5c555cc1856b713b (version 0.32.2)
and consumer runtime haveapi-client@0.32.0 remain unchanged. Embedded raw
provenance retains this generation source and is not relabelled after
downstream review or history changes.

The application uses generated incident_policy.index/show,
vps.incident_policy.index/show/update and
incident_report.policy_evaluation.index. Policy keys are runtime strings, never
configured-key enums. Generated checks for primitive types, required values and nullability, and server
registry validation remain authoritative. Nullable limit resets and false shared
permission survive actual SDK serialization. Policy updates return their scoped
authoritative row; the separate VPS permission acknowledgement requires exact
VPS Show verification. A failure after an accepted write remains uncertain.
Current counters, declared limits, configuration validity and scoped saved history
follow [the generic API contract](API_CONTRACTS.md#generic-incident-policies).

This supersedes the prior selected-policy interface and its callback-Unknown
state; development evidence retains the original inputs and reviews. Before WebUI
merge, replace the temporary input with a published SDK registry artifact
containing these resources and update manifest, lock, provenance and frontend
dependency hash together. Compatibility with the deployed API, configuration and schema remains a separate requirement.
See [packaging](PACKAGING.md#temporary-unpublished-sdk-input).

## Published generated client baseline

The preceding registry selection was `vpsadmin-typescript-client@0.4.0`.
Its provenance below describes that published baseline, not the selected
development archive.

The public tag [`v0.4.0`](https://github.com/vpsfreecz/vpsadmin-typescript-client/tree/v0.4.0)
selects source `c53cb4dabb0b3aac8d05834478872d2cfa698fa7`. Its 338234-byte npm
archive has SHA-256
`3a6f2a2a6f4eaeb31f490035b312e9b5403cf21589d649dc1fd31d60b64e1906`.
Inspected npm-reported provenance binds the source/tag and archive digest to
[release run 41670211965](https://github.com/vpsfreecz/vpsadmin-typescript-client/actions/runs/41670211965),
without independent Sigstore signature verification.

The release adds advisory Retract/Delete and optional non-null `expected_state`
on parent Update, CVE Create/Update/Delete and nested node-status
Create/Update/Delete. Existing inputs, outputs and the shared runtime remain
unchanged. These are actual contract changes; the preceding release's complete
program-byte equivalence does not apply. The generator remains
`1ef9b204ba45bb261d3334be5c555cc1856b713b`, with generator/Ruby version `0.32.2`.
The captured API is `942c6eaed41331f823d8e0f670ed239e2b308440`, with API 7 /
protocol 2 schema SHA-256
`d6ec617653913c56e92398a6032aa350118597a0e3f45c599bc92b6071ea0a26`.
The exact consumer runtime peer remains `haveapi-client@0.32.0`.

Guarded advisory writes require backend
`8225229aa0e3306f8b1723c5583969a33c64571c` or independently equivalent live
capabilities. An API version label does not prove support. WebUI's application
policy checks fresh authenticated generated root/action descriptions and the
actual selected state choices before writing. Draft synchronization checks all
six child mutation actions and sends frozen state/revision preconditions.
Missing actions or guard parameters deny writes; the client never drops guards
as a compatibility fallback. See [the advisory contract](API_CONTRACTS.md#guarded-advisory-corrections-req-055).

Typechecking uses the installed declarations. API fixtures feed serialized HTTP
responses through controlled XHR to the actual library, covering authentication,
renewal, public isolation, malformed envelopes, errors and aborts. Browser
fixtures exercise the ordinary application entry. Dependency adoption checks the
installed release against the verified archive and runs affected policy/wire and
strict checks; final Nix packaging follows committed-deliverable review. Retained
candidate browser/API evidence keeps its original input identities. These checks
do not certify live API permissions, OAuth exchange, task completion or deployment.

No database or persisted-format migration is needed. Application rollback
restores the matching frontend/BFF release while retaining the existing BFF
session store and credentials. Dependency rollback restores a matching source,
manifest, lock and npm cache hash. Dependency adoption does not deploy a release.

## Optional local generated client development

Use a packed snapshot to try an unreleased client checkout without changing the
WebUI manifest or lock. Coordinate with other local runners before installing:
this replaces the temporary `node_modules` tree.

In the chosen client checkout, enter its pinned development shell. Use an existing
private output directory outside the WebUI source tree:

```sh
cd /absolute/path/to/vpsadmin-typescript-client
nix develop
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm pack --ignore-scripts --pack-destination /absolute/path/to/private-output
git rev-parse HEAD
git status --short
```

The explicit build must succeed before packing with scripts disabled. Use the
exact filename printed by `npm pack`, record its SHA-256 with the checkout revision
and dirty status when sharing results, and keep the archive outside WebUI. An
already built and verified exact archive can be used directly.

Building compiles checked-in generated source; it does not regenerate it or prove
its provenance. Generated behavior changes still start in HaveAPI and use the
client's sole regeneration command. That command requires the exact recorded
HaveAPI HEAD before checking source digests; equal files at a different revision
do not bypass the guard.

In the WebUI's pinned development shell, start from the committed installation,
then set `client_archive` to that exact archive path:

```sh
cd /absolute/path/to/vpsadmin-webui
nix develop
npm ci
client_archive=/absolute/path/to/the-exact-archive.tgz
sha256sum "$client_archive"
npm install --no-save --package-lock=false --ignore-scripts "$client_archive"
```

`--package-lock=false` ignores the lock during this install, so other temporary
dependencies may also resolve differently. Do not force incompatible peers or
claim that the installed tree still matches the canonical lock. Check the public
entrypoint and the HaveAPI version resolved from the client:

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const entrypoint = import.meta.resolve('vpsadmin-typescript-client');
const requireFromClient = createRequire(entrypoint);
const manifest = JSON.parse(readFileSync('node_modules/vpsadmin-typescript-client/package.json', 'utf8'));
const runtime = JSON.parse(readFileSync(requireFromClient.resolve('haveapi-client/package.json'), 'utf8'));
assert.equal(runtime.version, manifest.peerDependencies['haveapi-client']);
const client = await import('vpsadmin-typescript-client');
assert.equal(typeof client.createClient, 'function');
console.log({ entrypoint, haveapiVersion: runtime.version });
JS
npm run typecheck
npm exec -- vitest run src/lib/api/sdk.test.ts src/lib/api/sdk.wire.test.ts
npm run dev -- --force
```

The package exports built `dist/index.js` and `dist/index.d.ts`. Restart Vite with
`--force` so its dependency cache does not retain the previous snapshot. Rebuild,
pack and reinstall after client changes; this workflow does not watch a source
checkout or use `npm link`.

To restore the committed installation, stop the local Vite process normally and
run:

```sh
npm ci
git diff --exit-code -- package.json package-lock.json
npm run dev -- --force
```

Repeat the entrypoint/peer check and confirm that the installed client comes from
the committed input. No uninstall or global-link cleanup is needed. Nix builds
continue to use committed inputs and exclude `node_modules` and `.vite`; they do
not verify this override. The isolated API runner is outside this override
workflow; use it only with its separately verified archive and receipt under the
existing runner procedure. Local npm/Vite results are development evidence, not a
reproducible release artifact.

## Generated vpsAdmin TypeScript SDK

`haveapi-client` provides transport and authentication. The separate
`vpsadmin-typescript-client` SDK provides generated vpsAdmin operations and types;
its version does not select a backend deployment or grant permissions.

Feature-branch, Git and local SDK dependencies are allowed during development.
A WebUI change that needs new SDK support must wait to merge until a published
SDK release contains the required generated members. Record those members and
the selected release. Before merge, the final manifest, lock and package
provenance must resolve that registry artifact and its integrity, without
temporary overrides. Check compatible API deployment or gate new calls on
backend capabilities separately; publication alone does not prove API readiness.

Follow vpsAdmin's [generated-client synchronization procedure](https://github.com/vpsfreecz/vpsadmin/blob/master/docs/api-schema-export.md#generated-client-synchronization)
for the API/client update sequence. Ordinary source synchronization does not
require a release. When a TypeScript-client release is needed, default to the
next minor version unless the user explicitly specifies a version or bump.
