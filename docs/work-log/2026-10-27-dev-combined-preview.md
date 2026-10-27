# Dev-only combined preview — 2026-10-27

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
