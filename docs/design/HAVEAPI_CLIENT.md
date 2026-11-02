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

## Published generated client

The root selects the exact registry dependency
`vpsadmin-typescript-client: "0.3.0"`. The npm-generated lock pins its canonical
registry URL and SHA-512 integrity. `npm ci` installs the published JavaScript
and declarations without a sibling checkout or client source build. Nix uses
ordinary registry dependency fetching; see [packaging](PACKAGING.md#temporary-unpublished-sdk-input).

The release tag [`v0.3.0`](https://github.com/vpsfreecz/vpsadmin-typescript-client/tree/v0.3.0)
selects client source `d354491537f8b654b4d2c33a705cad84474f95d6`.
Its 337128-byte npm archive has SHA-256
`57236647f4065a0ffeaabb0f5f6c64370a5ca4e7e530876b0d562c69651ce610`.
The inspected npm-reported provenance binds that source/tag and archive digest to
[release run 41538988296](https://github.com/vpsfreecz/vpsadmin-typescript-client/actions/runs/41538988296),
without independent Sigstore signature verification.

All 1352 distributed JavaScript and declaration files are byte-identical to the
previously tested client candidate `99ee06654ef956a09b52749f4cd02d1435362087`.
The archive paths, 675 generated ownership hashes, public exports and API 7 /
protocol 2 schema are unchanged. This establishes generated-program equivalence;
the release has different source and provenance identities. Its recorded HaveAPI
generator is `1ef9b204ba45bb261d3334be5c555cc1856b713b`, with generator/Ruby
version `0.32.2` and API capture `5586ea8ab7dbf7e116083b0ea1819ea4d17f66a5`.
The exact consumer runtime peer remains `haveapi-client@0.32.0`.

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
