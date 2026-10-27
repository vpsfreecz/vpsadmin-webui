# Dev-only combined preview — 2026-10-27

Status: deployed to dev only; individual PRs remain open. Runtime revision:
`2a70ca791c67fdc19341976dbddac50cde8cd77d`. Later documentation commits do
not change that runtime pin.

The maintainer explicitly requested deploying our eight open PRs together to
dev.crucio.cz for interactive review before production approval. This does not
authorize merging PRs into main or updating either production WebUI host.

Requirements: REQ-023, REQ-048, REQ-050, REQ-051, REQ-068 and REQ-076.

## Scope and preparation

Base main: 5a2d2bdc3ad7a827038f877d75959916528db844. Previous live dev
frontend/BFF: f7a8f10cbb94a5dbc160b4e7c9854245c7588d05. Source main differs
from that runtime only by the completed-release documentation.

All six remote checks passed for each selected head before integration:

| PR | Selected head |
| --- | --- |
| #88 | `5cd07a805ca682d7cb3e43e3a31030e348e61850` |
| #89 | `5c29bc1d587ee4b1e4f5807f75c1dbff99abeb98` |
| #90 | `a11a5b2d6d90bd9447355a6edb825b72150df3a6` |
| #91 | `c07bd9f38a8ee40bf1f043d5ff5749253108d819` |
| #92 | `23c15b28c2a2f8d09da1e5aea19ed342da021da1` |
| #93 | `a14fff06fe01301db12673b427c819baa11ffaa8` |
| #94 | `af0af6bded8184991e2938b36c5e35a5f5679b3e` |
| #95 | `e0abc0be663709d46b3dbe00b6e1a97cf0c0dfe4` |

The integration branch preserves the original commits. Conflicts are confined
to shared documentation and browser/typecheck lists; combine independent workflow
requirements and retain every feature's strict/WebKit test selection. No foreign
PR (#63/#74/#87), API/database migration or site configuration change is included.

An initial local conflict-resolution helper produced malformed test configuration
before any build or publication. It was corrected on the unpublished integration
branch, and explicit set-inclusion assertions verify every source branch's
strict/WebKit entries. The first quick check then caught JSON formatting; apply
the configured formatter and rerun the full combined check. No audit is weakened.

## Verification and activation

Combined source checks, package build and browser acceptance are pending. Do not
infer combined success from the eight individual PR checks. Build in isolated
/data space and verify exact clean frontend/BFF provenance before staging.

Retain the old paired pointers and assets, validate the candidate using the
existing systemd credential contract, and promote under the existing dev deploy
lock with paired rollback on failure. Preserve runtime secrets, session store,
OAuth routing, the separate dev API, other WebUI service and all VMs. No npm
installation is performed in a live release.

Append actual deployment/check evidence after activation. Visual examples must
identify synthetic fixtures versus real isolated API observations. No production
release or live destructive test is claimed by this preparation record.

## Completed verification and deployment

- Combined `npm run ci:pr` passed on the clean runtime candidate: quality/type/
  documentation checks, 226 script tests, 57 BFF tests, 1,893 unit tests in
  305 files and production build. The existing bundle-size warning remains.
- Seven feature specs passed 129/129 checks across desktop Chromium, mobile
  Chromium and mobile WebKit on the combined source, with the original test
  expectations and each feature's browser selection retained.
- Full x86_64-linux Nix frontend/BFF builds, provenance, source/package-content
  and NixOS module-evaluation checks passed for the exact clean runtime commit.
  The first command's copied SHA guard rejected the invocation before building;
  the successful run verified the full SHA read directly from Git.
- Frontend: `/nix/store/wvkh8fj95s8436gk37gc2f2rc6s1286s-vpsadmin-webui-frontend-1.0.0`.
- BFF: `/nix/store/1cgv8ay26hw3lrj54kslvm0ilml8b121-vpsadmin-webui-bff-0.1.0`.
- Both packages report the same full revision and dirty=false. Staged BFF
  dependencies are readable by webui-bff; packaged qs is 6.16.1.
- Candidate settings/session-store validation ran through systemd's actual
  credential-loading contract. nginx validation passed. The dev deployment
  lock guarded paired pointer activation and automatic rollback handling.
- After activation, frontend metadata, BFF metadata and the BFF process cwd
  independently match the candidate. Auth endpoint smoke passed. nginx, the dev
  BFF and the unrelated kra BFF remain active. No configuration/secret/session
  files were replaced, and no API/database/VM operation was performed.
- The same seven specs passed another 129/129 checks against the actual served
  HTTPS bundle. A browser-only harness supplies a synthetic BFF config/session
  and the specs' synthetic API responses, and blocks requests to real versioned
  API paths. This verifies deployed assets, not live mutation authorization.
- The initial direct fixture attempt lacked that production BFF bootstrap and
  correctly reached Sign in required; it was stopped and is retained as a
  failed harness attempt. No application auth gate was relaxed.
- Separate unmocked anonymous acceptance passed three browser contexts (desktop
  Chromium, mobile Chromium, mobile WebKit): exact clean revision, isolated dev
  API origin, About/commit link, fitting layout, denied admin access, correct JS
  MIME/status and no JavaScript exceptions. The first ad-hoc check assumed an
  English sign-in heading on Safari, which selected Czech; assertions now
  recognize the two exact existing localized labels and all contexts passed.
- TLS verification was relaxed only for dev's existing certificate issue. Both
  public sites were checked with normal TLS and still report `f7a8f10cbb94a5dbc160b4e7c9854245c7588d05`. Main remains 5a2d2bdc; no PR was merged.

Dev review links: <https://dev.crucio.cz/admin/transactions> and
<https://dev.crucio.cz/app/transactions>. All eight selected PRs are present
in published branch `dev/preview-20261027`; no additional integration PR or
production channel/pin update was created for this dev preview.

## Rollback and remaining acceptance

The previous pair is retained at
`/data/webui-release-20261023/releases/f7a8f10cbb94a5dbc160b4e7c9854245c7588d05`
(and its dist subdirectory). The current stage and private activation receipt
are below `/data/webui-preview-20261027`; keep that directory while it is live.
An application rollback restores both recorded symlinks under the dev deploy
lock, restarts webui-next-bff, and repeats metadata/health/auth checks; do not
restore old session files. Root retains about 9.1 GB free and /data about 851 GB.

The maintainer can now review the combined behavior interactively. Authenticated
live member mutations and complete live API permission checks were not repeated
for this preview. Production release still needs explicit selection/approval and
verification of the final combined production source; individual green PR checks
and this preview are not a production deployment instruction.

## Implemented deployed-bundle captures

These are the actual deployed candidate with synthetic BFF/API fixtures, not
real member data or a mockup:

- [Desktop transaction history](screenshots/2026-10-27-dev-preview/desktop-transactions.png)
- [Desktop chain detail](screenshots/2026-10-27-dev-preview/desktop-chain.png)
- [Mobile chain detail](screenshots/2026-10-27-dev-preview/mobile-chain.png)
