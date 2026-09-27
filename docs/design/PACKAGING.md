# Immutable frontend and BFF packages

Requirement: [REQ-068](REQUIREMENTS.md). The flake exposes separate
`packages.x86_64-linux.frontend` and `packages.x86_64-linux.bff` outputs. The
frontend package is the public static root. The BFF package contains its own
production Node runtime graph and executable. These packages do not enable a
service or deploy a host; the NixOS module and site configuration are separate
work.

## Reproduce the dependencies

Enter `nix develop` for the locked Node 24 and `prefetch-npm-deps` tool. The
root and BFF are independent npm projects with unchanged lockfiles. Compute
their hashes separately from the repository root:

```sh
prefetch-npm-deps package-lock.json
prefetch-npm-deps bff/package-lock.json
```

The recorded hashes for the current lockfiles are
`sha256-qipQBgqu4SMKocavlqdFxFugtB2UYEmgX3fRW+UKdTA=` and
`sha256-imijdRISN2eVBsYX79YBxl7zKM7Pjq3rixkKXJNDSvw=`, respectively.
They are used only by their corresponding derivations. The root prefetch
reported six nested WASI packages without resolved URLs. Their apparent
platform specificity is an inference; only an actual x86_64 package build can
establish whether the cached dependency set is sufficient. Do not edit a lock
or reuse the other project's hash to work around a fetch failure.

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
package results on the exact candidate before including them in a NixOS
module. Roll back the frontend and BFF as a matching pair; retain the session
store and signing secret so an application rollback does not destroy sessions.
The existing `/config.json`, `/config.js`, `/session.json` and OAuth contracts
remain the runtime interface.
