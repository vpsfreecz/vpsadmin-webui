# Immutable frontend and BFF packages

Requirement: [REQ-068](REQUIREMENTS.md). The flake exposes separate
`packages.x86_64-linux.frontend` and `packages.x86_64-linux.bff` outputs. The
frontend package is the public static root. The BFF package contains its own
production Node runtime graph and executable. These packages do not enable a
service or deploy a host; the reusable [NixOS service module](NIXOS_SERVICE.md)
is disabled by default and site configuration remains separate.

## Reproduce the dependencies

Enter `nix develop` for the locked Node and npm. The root and BFF are independent
npm projects. Both use ordinary `buildNpmPackage` locked dependency fetching.
Compute each project's cache hash from its own lock:

```sh
prefetch-npm-deps package-lock.json
prefetch-npm-deps bff/package-lock.json
```

The frontend cache hash belongs to [frontend.nix](../../packages/frontend.nix);
the separate BFF hash belongs to [bff.nix](../../packages/bff.nix). The frontend
includes exact inputs for the generated client and HaveAPI runtime,
with the locked XMLHttpRequest transport. See their
[source and artifact contract](HAVEAPI_CLIENT.md). The root prefetch reports six
bundled optional dependencies nested under `@tailwindcss/oxide-wasm32-wasi`
without separate resolved URLs. Their WASI-only placement and bundled metadata
explain the warning; an actual x86_64 package build establishes whether the cached
dependency set is sufficient. Do not edit a lock or reuse the other project's hash
to work around a fetch failure.

<a id="temporary-unpublished-sdk-input"></a>

### Generated client input

The root temporarily selects the SDK-owned immutable HTTPS archive described in
[the client contract](HAVEAPI_CLIENT.md#unpublished-generated-sdk). Manifest,
npm-generated lock and [development provenance](../../packages/vpsadmin-typescript-client-development.json)
select artifact commit `6a6ca3613ce947a1393597d5ddcbc78294f6b12d`, packed source
`6a5227c156aeef89447abb1f2e68988cecb735f4` and the same verified archive integrity.
The archive includes compiled exports and declarations. It needs no sibling
checkout, private path, local file dependency or custom fetch/build pipeline.
Standard `prefetch-npm-deps` supplies the frontend hash. The shared HaveAPI
runtime peer and separate BFF dependency graph remain unchanged.

This is a development candidate, not registry publication or merge readiness.
A published SDK release containing the required incident members must replace
the temporary input before WebUI merge. Update the manifest, lock, provenance
and frontend hash together.
The installed public root contains only the reviewed compiled frontend output.

For an intentional dependency update:

1. Verify the selected archive, source/provenance, public exports and exact HaveAPI
   peer. Keep runtime and generator versions distinct.
2. Generate the manifest and lock with pinned npm:
   `npm install --package-lock-only --ignore-scripts --save-exact vpsadmin-typescript-client@<verified-version>`.
   Inspect the bounded lock delta and preserve unrelated dependency records.
3. Coordinate with local runners before `npm ci`, then verify the installed
   input and affected policy/wire and declaration checks.
4. Run `prefetch-npm-deps package-lock.json` and update only the frontend
   `npmDepsHash` for a root dependency change. The BFF lock and hash are separate.
   Commit source, lock, hash and documentation changes and complete independent
   review before final frontend/BFF/provenance/source/package checks.

Rollback restores the matching source, manifest, lock and cache-hash set.
The [optional local-client workflow](HAVEAPI_CLIENT.md#optional-local-generated-client-development)
uses standard `npm pack` and a no-save npm archive override. It leaves committed
packaging inputs unchanged; Nix continues to use the committed locked input.

## Source, contents and provenance

Both packages use one cleaned flake source. It retains the linked design
handbook, generated inventory, source and scripts needed by the archive-safe
design audit. It excludes generated and private paths, including `.git`,
`node_modules`, build outputs, audit artifacts and `.env*`. A symlink in the
retained source stays visible to `check-package-source.mjs`, which rejects it
before the frontend install/build phase; filtering must not conceal an external
reference. Fixed-output dependency fetching is a separate build prerequisite.
The frontend also runs the design audit on the actual Gitless derivation source
before building.

The frontend build selects `VITE_RUNTIME_MODE=bff`. Its installed public root
contains only `index.html`, `favicon.png`, schema-1 `build-info.json` and
compiled `assets/`. Vite's copied `config.local.js.example` is deliberately
excluded. The BFF installs only its reviewed own runtime modules,
`package.json`, production `node_modules`, a pinned slim-Node executable wrapper
and separate metadata under `share/vpsadmin-webui-bff/build-info.json`. It
includes the credential reader code but no credential file or secret value. It
does not run npm or build source at service start. The package-content check
rejects extra public files, source maps, missing runtime imports/dependencies
and mismatched metadata. A real closure check is still needed before claiming
that no shell or full Node toolchain is present at runtime.

One flake provenance value is passed to both derivations. A clean Git-backed
flake revision produces a full 40-character commit and `dirty: false`. A
recognized dirty revision keeps that commit with `dirty: true`. A source without
a trustworthy revision records `unknown`, `dirty: true` and
`source: unavailable`. The frontend build receives both `VITE_BUILD_SHA` and
`VITE_BUILD_DIRTY`, so loss of `.git` cannot turn dirty or unknown source into a
clean release. Both metadata files retain the schema-1 fields `schemaVersion`,
`commit`, `shortCommit`, `dirty` and `source`; clean release acceptance requires
matching full commits and false dirty flags.

## Verification and deployment boundary

```sh
nix build .#frontend .#bff
nix build .#checks.x86_64-linux.provenance
nix build .#checks.x86_64-linux.source-contents
nix build .#checks.x86_64-linux.package-contents
```

The source check rejects missing audit inputs, generated/private files and
symlinks. The package check builds both outputs and checks their installed
contents together. Local Node fixtures and Nix syntax checks cover the checker
and provenance logic without claiming a successful Nix build. Verify the
package results on the exact candidate before enabling the NixOS module.
Roll back the frontend and BFF as a matching pair; retain the session
store and signing secret so an application rollback does not destroy sessions.
The existing `/config.json`, `/config.js`, `/session.json` and OAuth contracts
remain the runtime interface.
