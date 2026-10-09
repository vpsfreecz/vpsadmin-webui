# VPS controls inside the console (2026-10-09)

The maintainer requested legacy-equivalent power, password and rescue controls
below the console session toolbar, and removal of Open in new tab (REQ-020,
REQ-023, REQ-010/011). Prepared on canonical main after release e21d95c;
this new feature is not merged or deployed by this change.

The second wrapping row reuses the parent detail's power/password actions and
confirmation dialogs, preserving permission/state gates, mutation locks,
preflight, frozen target and asynchronous password disclosure. Forced shutdown
and reset remain options in their existing confirmations. Rescue runs in a
separate dialog so the terminal stays mounted. It reuses the Boot adapter,
payload builder and mutation snapshot/preflight helpers, offers compatible
OS templates and optional root mount, preserves rejected drafts, and tracks
accepted action receipts. It does not introduce an API/backend change.

The locked vpsAdmin terminology/API source is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, resolved with Nix and read from its
store source. The locked Boot authorization permits admin or VPS owner and
requires vpsAdminOS; this corrects the console omission without broadening
support access or changing the separate admin lifecycle page. Czech rescue
wording follows the guide's “nouzový režim”. The extra revision eval hit the
dev host's pre-existing full root filesystem; the lock records the same source.
Build/test work uses an isolated /data checkout and the cached pinned shell.

Verification and screenshots follow. Browser fixtures certify UI behavior and
payloads, not real VPS shutdown/password/rescue operations. External KB captures
have not been republished; this console toolbar change affects their screenshots.

## Browser review

All six new console scenarios passed in desktop Chromium, mobile Chromium and
mobile WebKit (18 passes). They cover Czech/admin and English/owner controls,
forced shutdown/reset payloads, known rejections with retained drafts, rescue
with/without a root mount, cgroup filtering, invalid mountpoints, suspended and
support gates, delayed password disclosure and missing-receipt submission locks.
The iframe and session token remain unchanged through these dialogs/actions.

The existing console session, viewport and support-permission scenarios also
passed (20 Chromium/mobile-Chromium plus 9 mobile-WebKit cases). Four additional
viewport cases passed against the locked console router's actual terminal and
keyboard renderer with synthetic feed responses, including small laptop and
mobile sizes. These tests do not operate a real VPS or certify API lifecycle
success. No public site was updated for this feature.

Implemented UI with synthetic data:

- [Desktop toolbar](../design/images/console-controls/desktop.png)
- [Mobile toolbar](../design/images/console-controls/mobile.png)
- [Mobile rescue dialog](../design/images/console-controls/rescue-mobile.png)

The touched console session spec is now included in strict E2E TypeScript
coverage alongside the new controls spec (45 adopted, 210 deferred). Its old
mock-helper parameter inferred the wrong overload; it now explicitly uses Page.
The immutable original E2E baseline is unchanged. Initial new-fixture assertions
were corrected for HaveAPI's namespaced request payload and the intentional
interactive explanation on aria-disabled action buttons.

## Validation

Pinned Node 24 checks passed: explicit ESLint on both new components and the
shared layout; frontend/tooling/strict E2E/BFF type checks; localization,
mutation, structure, overlay, documentation and other quick audits. Full suites
passed: 226 script tests, 57 BFF tests, and 1,770 Vitest tests across 296 files.
The production BFF-mode frontend build passed. Its existing large-chunk warning
remains informational. The isolated test checkout initially lacked its BFF
node_modules link; restoring the matching cached dependencies resolved the
setup failure without source or deployment changes.

GitHub CI and maintainer review remain separate from this local/pinned evidence.
