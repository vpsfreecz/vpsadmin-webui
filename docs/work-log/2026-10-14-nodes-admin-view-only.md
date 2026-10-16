# 2026-10-14 — Restrict the Nodes section to administrator view

## Request and cause

The maintainer noticed Nodes in My view and clarified that ordinary members
should not have this section. Source inspection confirmed an unconditional
personal-sidebar entry and three personal routes mounting node list/history
pages. This affected members as well as administrators using My view; it is not
proof that the API allowed privileged infrastructure changes.

## Change (REQ-001)

Remove the personal-sidebar entry and explicitly deny the three existing personal
node routes before their page components mount. Preserve admin/support access and
existing detailed-evidence restrictions in administrator view. Public/dashboard
cluster status and API permissions are unchanged. No API or BFF changes.

Adapt the existing history/heatmap fixtures to the new product boundary and retain
positive administrator/support coverage, pagination, retry, localization and
heatmap checks. Add role-specific personal-route and member admin-route checks,
including assertions that node data is not requested.

## Verification and status

Prepared in an isolated branch from main cce6814; not merged or deployed.
Browser evidence uses synthetic HaveAPI fixtures, not a live API or production
account. No live permissions audit or deployment is claimed.

- `npm ci` (root and BFF): passed. Local Nix is unavailable; used the official
  SHA256-verified Node 24.21.0 distribution with bundled npm 11.19.0, matching
  `env:locked`, rather than claiming a Nix-shell run.
- `npm run ci:quick`: passed (audits, lint, formatting and strict type checks).
- `npm test`: 296 files, 1,799 tests passed.
- `npm run test:scripts`: 226 tests passed.
- `npm run build`: passed; existing large-chunk advisory remains.
- Playwright `node_history.spec.ts` and `node_heatmaps.spec.ts`, Chromium and
  mobile Chrome: 36 passed. Checks cover member/support/admin personal deep links,
  no node-data requests from denied pages, member admin-route denial, support
  evidence restrictions, cs/en history, paging/retry and public/admin heatmaps.
- Adopted both edited E2E files into strict TypeScript coverage, as required by
  the changed-file ratchet; updated its explicit inventory-count assertions.
- Reviewed the existing router structural-debt entry: only the ForbiddenPage
  import adds a line (510 to 511); refreshed its content hash and rationale.
  The general size limit and all other entries remain unchanged.
- No hook framework or active Git hooks are declared in this checkout.

Synthetic fixture screenshots of denied direct access (the desktop sidebar also
shows the removed entry): [desktop](assets/nodes-admin-view-20261014/desktop.png),
[mobile](assets/nodes-admin-view-20261014/mobile.png).
