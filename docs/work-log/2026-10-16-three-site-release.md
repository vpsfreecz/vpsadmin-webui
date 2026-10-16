# Three-site release preparation — 2026-10-16

The maintainer authorized merging all eight open WebUI PRs and deploying the
combined release to dev.crucio.cz, clankerdev.vpsfree.cz and newadmin.vpsfree.cz.
The API is unchanged. Configuration channel updates may be committed and pushed
directly without a separate PR, as explicitly instructed by the maintainer.

## Selected application changes

- #40: compact search scope reminder only after an empty result.
- #41: dashboard node heatmaps.
- #42: Nodes navigation and routes restricted to administrator view.
- #43: compact public news.
- #44: independent Czech and English news fields.
- #45: inline or saved initialization templates for VPS creation/reinstallation.
- #46: full-width export hosts and vertically stacked mount examples.
- #47: export owner filtering and navigation from member detail.

Integration starts from main `cce681424b866f6a51cbc0a1e4daa226ed33fc07`.
Merge commits retain the feature histories. Shared documentation and browser
configuration are reconciled to preserve both export changes and all adopted
browser tests. Heatmap tests use `/admin/nodes` after the access restriction.
The combined strict E2E manifest contains 53 adopted and 205 deferred files.

## Preparation and rollback

No target has been updated at this stage. Required checks and the combined
production build must pass before promotion. The older hosts retain release
`babdd7fb5b0533a2bbc4e2f683fb6f9a248fd7c7` as their paired frontend/BFF rollback.
Newadmin currently uses NixOS generation 11, with the current configuration
channel pointing to `cce681424b866f6a51cbc0a1e4daa226ed33fc07`.
Revisions will be rechecked immediately before each activation.

Dev's root filesystem is full; staging uses `/data`. Its existing test API,
credential files and sessions are preserved. Dev also retains its existing TLS
certificate mismatch. Tests using synthetic browser fixtures will be identified
separately from live endpoint checks.

Actual build, CI, deployment and verification results will be appended after
completion. This preparation record is not evidence of deployment.
