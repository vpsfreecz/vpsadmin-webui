# Adopt the published incident-policy SDK

## Request and scope

The maintainer authorized TypeScript-client publication and integration of the
pending changes, with quick verification only. Related requirements: REQ-060 and
REQ-068. The frontend now selects exact registry release
`vpsadmin-typescript-client@0.5.0`, replacing the immutable development archive.
Manifest, npm-generated lock, SDK provenance and frontend npm dependency hash
change together. UI, API, transport, BFF dependencies and generated schema remain
unchanged. The existing PR115 retains its scope and historical verification.

## Source and artifact

Release `v0.5.0` identifies SDK source
`d8cb484748db8687554822772a98a1f873414d65`; its 345047-byte archive has SHA-256
`9cf9a37506e5af19611b27956f582e8a4860da1f22fc63941ef5b0c4bdb796d9`.
Registry integrity and parsed provenance match the reviewed candidate and
[release run 45236858019](https://github.com/vpsfreecz/vpsadmin-typescript-client/actions/runs/45236858019).
The archive's compiled JavaScript and declarations match the accepted development
input byte for byte; package version and release metadata differ. It contains the
required generic policy operations, saved evaluations and nullable match, period
and notice-policy fields. Runtime `haveapi-client@0.32.0`, generator `0.32.2` and
the original `de4df3d` API capture remain unchanged. The update reuses the existing
generated source and capture.

## Verification and status

The installed SDK's 1,382 files match the registry archive. Application type
checking and 54 focused SDK, wire, incident-policy, incident and VPS tests passed.
Standard dependency prefetch produced the frontend hash
`sha256-dFaZ61nEoJLol88YllcvB8CvqBvgxILg1+y/98VVOCk=`. Documentation, diff and formatting checks passed.

Installation warned that esbuild's postinstall script was not covered by the
installed allowScripts policy. The prefetch retained six optional WASI package
URL warnings. These warnings prompted no additional script-policy or dependency
changes. No frontend, BFF or system package build, VM test or browser test ran.
Earlier `25c8db48` browser and package results retain
their development-archive input and do not certify this registry-input package.
The registry-release prerequisite is resolved; final changed-input package
verification and compatible backend deployment remain distinct. No deployment,
configuration pin, database migration or runtime change is included. Rollback
restores the matching manifest, lock, provenance and frontend hash.
