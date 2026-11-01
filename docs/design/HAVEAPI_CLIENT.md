# HaveAPI client dependency and provenance

The frontend imports `AsyncClient`, `AsyncError` and `RequestSpec` from the
published `haveapi-client@0.32.0` npm dependency. Authenticated, public and
fallback-description requests use this library through the WebUI policy in
[API contracts](API_CONTRACTS.md#production-haveapi-client). The package owns
XHR, request serialization and wire decoding; WebUI retains session renewal,
per-request authentication/language and receipt-preserving domain output narrowing.
The generated SDK owns operation paths, input validation, descriptions and exact
output namespaces; its complete RequestSpec passes through the shared policy.
See the [migration record](../work-log/2026-11-01-typescript-client-migration.md)
for candidate artifact inputs and the current dependency publication boundary. BFF session
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
establish the application compatibility boundary; the adapter remains unchanged.

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

Typechecking uses the installed declarations. API fixtures feed serialized HTTP
responses through controlled XHR to the actual library, covering authentication,
renewal, public isolation, malformed envelopes, errors and aborts. Browser
fixtures exercise the ordinary application entry. Run full unit/build and Nix
frontend/source/package checks after committed-deliverable review. Fixtures do
not certify live API permissions, OAuth exchange, task completion or deployment.

No database or persisted-format migration is needed. Application rollback
restores the matching frontend/BFF release while retaining the existing BFF
session store and credentials. Dependency adoption does not deploy a release.
