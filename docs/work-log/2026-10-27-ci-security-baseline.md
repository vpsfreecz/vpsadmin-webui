# PR security baseline repair

Date: 2026-10-27. Requirements: REQ-068, REQ-064. Status: preparation/verification;
no PR merged and no application deployed. Security candidate local checks passed;
remote checks and feature dependency propagation are tracked separately.

## Diagnosis and changes

After authentication was restored, our eight prepared branches became PRs
#88–#95. Only #88 and its stacked transaction PR #89 included the body-parser
1.20.9 patch. The independent feature PRs #90–#95 inherited main's 1.20.6 lock;
the required BFF audit therefore rejected the same baseline before their
application checks. Job logs for #90 and #95 identify GHSA-27r3-jxmh-p828.
Publishing those branches before carrying their security prerequisite caused
avoidable repeated failures. No success was inferred from their local UI tests.

A new moderate qs advisory was published on October 27:
[GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw).
The existing qs override changes from 6.16.0 to patched 6.16.1. The lock changes
only that resolved version and its registry metadata; body-parser remains 1.20.9.
No BFF parser/authentication/session code, API behavior or root lock changes.

The BFF's independent hash was generated with the locked Nix prefetch tool:
`sha256-pifjCWQ5ShvtQw1V3bAlmutW43nPi93hDVW8Q4HuVMw=`. The derivation
and packaging guide use the same hash. No fake hashes or disabled audit gates.

## Review and CI execution

Keep #88 independently reviewable. Our other PR branches will explicitly carry
that dependency with ordinary merge commits, retaining published history and
both feature/security documentation. Their PR base is #88's branch so reviewers
see the independent feature diff; after approved security integration they can
return to main. This is branch preparation, not merging any PR into main.
Unrelated PRs #63, #74 and #87 remain untouched.

Obsolete runs on the eight heads being replaced were cancelled before publishing
new heads. No notification preference, required test, audit severity threshold,
retry policy or test expectation is weakened to suppress mail. Avoid manual
duplicate workflow dispatches; publish one validated update per head and inspect
its resulting CI. Earlier cancelled and failed runs remain part of the evidence.

## Local verification checkpoint

- Locked Node 24.21.0/npm 11.19.0, fresh root and BFF npm ci.
- Fresh BFF production audit: zero vulnerabilities after both patches.
- Advisory input `qs.stringify({a:[{toString:1}]}, {arrayFormat:'comma'})`
  returns safely rather than throwing; original runtime code is unchanged.
- `ci:tests`: 226 script tests, 57 BFF tests, 1,869 unit tests passed.
- Nix prefetch completed in a new isolated directory under /data on dev, not a
  serving checkout. Full x86_64-linux Nix build subsequently passed for frontend and BFF, together
  with provenance, source-content and package-content checks on a clean Git-backed
  isolated checkout. Both built packages reported the same full clean source
  revision. This closes the earlier disk-space build blocker without deploying.
- `ci:quick` passed. An unpublished documentation-only amendment records the
  build receipt; rebuild the final amended head before claiming its provenance.

The first local test attempt lacked the root development dependencies; it failed
before a fresh root npm ci and successful repetition. The first remote Nix
command lacked the required nix-command/flakes flags and was retried explicitly,
without changing host-wide configuration.

The maintainer separately authorized a bounded Nix cache cleanup: root now has
about 11 GB free. Builds use isolated /data source and do not delete profiles,
VM disks, user objects or service state. Disk space is checked again before a
large build. This task does not authorize deployment or unrelated cleanup.
