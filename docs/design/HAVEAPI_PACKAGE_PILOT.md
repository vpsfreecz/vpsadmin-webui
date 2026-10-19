# Injectable HaveAPI request client and package pilot

Requirements: REQ-007, REQ-011, REQ-012 and REQ-059. The production application
continues to use its fetch transport. The injectable adapter runs a candidate
`haveapi-client` package through the existing WebUI request policy before a
dependency update or transport rollout.

## Request and session policy

[haveapi.ts](../../src/lib/api/haveapi.ts) owns authentication headers, language,
BFF session recovery, one read retry, envelope unwrapping and WebUI errors.
[haveapiTransport.ts](../../src/lib/api/haveapiTransport.ts) prepares the existing
fetch query/body once so a retry retains the original request.
[haveapiRequestClient.ts](../../src/lib/api/haveapiRequestClient.ts) accepts a
structural request client and supplies a transport for that same policy. It has
no runtime import of the candidate package. Callers must configure the injected
client with the same versioned API base URL as the WebUI.

The injected client owns serialization, HTTP and protocol validation. The adapter
maps its validated envelopes and structured failures into WebUI results and errors. The existing scalar-query guard applies to
both transports. Parameters without an input namespace remain omitted, matching
the default transport. HTTP 200 API rejection keeps `HaveApiError.httpStatus`
undefined. Transport loss, timeout, abort and malformed responses retain uncertain
mutation classification. A qualifying 401 can renew the same BFF session and
retry one read using the original language. A rejected write is never replayed;
its caller receives the existing resubmit error after successful renewal.

Local request-client fixtures cover these mappings and the stable-session guard.
The normal application compilation and tests require no candidate package.
Candidate protocol validation can be stricter than the default fetch decoder;
the pilot does not establish parity for every malformed server response or
approve switching production transport.

## Packed artifact proof

Build and pack the HaveAPI candidate from a known committed source revision.
After reviewing the committed WebUI and HaveAPI deliverable, run in the locked
Node development shell:

```sh
npm run test:haveapi-package -- --package /absolute/candidate.tgz --webui-ref HEAD --haveapi-ref FULL_HAVEAPI_COMMIT_SHA
```

The script resolves `--webui-ref` to a commit and archives that committed source
into an owned temporary directory. Dirty source is excluded. It freezes the
candidate tarball bytes, runs `npm ci` in the snapshot and installs the candidate
there with `--ignore-scripts --no-save --package-lock=true`. The snapshot lock
lets npm retain existing dependency versions while adding the candidate.
The runner records manifest/lock hashes and each installed locked package's
name/version after `npm ci`. It rejects file changes and any changed or missing
baseline package before running consumer tools. Platform-optional packages
absent from that installation stay outside the baseline; new candidate dependency
paths are allowed. The real checkout's dependencies and lockfile are untouched.
The candidate is absent from normal application dependencies, lockfiles and
Nix hashes.

The proof compiles a consumer against the package's actual generated declarations
and builds a dedicated Vite application with its actual `AsyncClient` import.
Its Chromium fixtures reuse WebUI bootstrap/HaveAPI HTTP fixtures to check query
and JSON requests, 401 read renewal, no write replay, changed-session rejection,
pre-dispatch/in-flight abort, and an action-state receipt without completion
polling. Separate Chromium, Firefox and WebKit projects load the exact installed
UMD main artifact with an ordinary script tag and native XHR. Each checks both
clients' setup and a dynamic GET, callback undefined returns, the global export
shape and async wrapper/metadata. AMD/CommonJS registration remains covered by
HaveAPI's VM compatibility fixtures. Missing browser engines are failures to
complete the proof; no project is silently skipped.

Install the locked browser engines with the existing wrapper when needed:

```sh
npm run e2e:install -- chromium firefox webkit
```

The Chromium executable override applies only to Chromium projects. The pilot
uses its own loopback preview port 5189 and fails if it is already occupied.
Browser fixtures use synthetic responses and do not certify backend permissions,
a real OAuth provider, task completion or a deployed application.

`result.json` records the frozen tar SHA-256, committed WebUI ref, HaveAPI source
claim, effective tool versions and result. The script prints its temporary
artifact directory, retained outside Nix's transient shell directory by default.
`HAVEAPI_PACKAGE_TMPDIR` can select an existing temporary parent directory.
Browser failure traces remain in that snapshot. Retained source/npm trees are
disposable after their evidence has been collected.

If package metadata has no `gitHead`, `--haveapi-ref` is required as a pack-owner
assertion. Conflicting supplied and packaged refs fail. Neither ref proves the
tarball's source equivalence by itself: retain the pack owner's build/source
receipt alongside the hash. Interruptions propagate to owned subprocess groups;
failed runs retain their result and artifacts for diagnosis.

Browser-free runner tests use disposable Git fixtures to verify committed-source
selection, frozen tar bytes, install isolation, locked graph/file drift rejection
and provenance conflicts. Run:

```sh
node --test scripts/test-haveapi-package.test.mjs
```

A passing pilot is package-fit evidence. A published package, dependency update,
production transport migration, PR approval and deployment each remain separate
steps.
