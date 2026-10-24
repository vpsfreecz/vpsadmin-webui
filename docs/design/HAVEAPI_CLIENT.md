# HaveAPI client dependency and provenance

The frontend imports `AsyncClient`, `AsyncError` and `RequestSpec` from the
published `haveapi-client@0.31.1` npm dependency. Authenticated, public and
fallback-description requests use this library through the WebUI policy in
[API contracts](API_CONTRACTS.md#production-haveapi-client). The package owns
XHR, request serialization and wire decoding; WebUI retains session renewal,
per-request authentication/language and domain result projection. BFF session
and OAuth exchanges keep their separate implementation.

## Published source and artifact

The exact root dependency is `haveapi-client: "0.31.1"`.
[The provenance record](../../packages/haveapi-client-provenance.json) binds the
registry URL and npm SHA-512 integrity to the published SLSA provenance.
The attested release workflow uses `refs/tags/v0.31.1` at HaveAPI commit
[`d49cfa3f3b8ee42f6cd8a6b7de8b7d551215cd42`](https://github.com/vpsfreecz/haveapi/commit/d49cfa3f3b8ee42f6cd8a6b7de8b7d551215cd42),
directory `clients/js`, and
[release run 40592240342](https://github.com/vpsfreecz/haveapi/actions/runs/40592240342).
All 53 packed files match their tracked `clients/js` files at that source commit.
Compared with 0.31.0, the only implementation-source change is the
`Client.Version` constant. Async transport/authentication and declaration inputs
are unchanged. The actual distributed bundle equals the preceding bundle after
the version-string substitution; its declarations are byte-identical. Archive
digests, packed files and provenance fields were verified for this release;
this does not claim cryptographic verification of the provenance signature.
The package has no `gitHead`; its version alone is not source proof. It includes
its MIT license and bundled TypeScript declarations at
`dist/types/haveapi.d.ts`. The UMD main exports both the callback and async APIs.

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
