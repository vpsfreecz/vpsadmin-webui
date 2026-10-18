# Snapshot NFS export shortcut — 2026-10-17

**Request:** [Discourse post #5](https://discourse.vpsfree.cz/t/372/5)
asks for direct NFS export from a backup row, as in the legacy PHP UI.

**Change:** the shared dataset snapshot list now exposes NFS export in desktop
rows and mobile cards. Existing exports link directly to their detail; new
exports use the centered existing creation dialog with dataset and snapshot
preselected. The selected snapshot remains available even outside the picker's
first 100 entries. Creation retains ownership/lifecycle/busy gates. No API or
backend changes. REQ-048 and the storage workflow document the behavior.

**Terminology:** followed docs/i18n-cs.md and localization instructions from
locked vpsAdmin revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
Nix is unavailable on this Mac; the exact locked documents were read through
GitHub and checks use local Node 24 with npm 11.6.2, not a Nix-certified shell.

**Verification (local fixtures, no live API):**

- `npm run typecheck`, `npm run typecheck:e2e:core`, `npm run build`: passed.
- `npm test`: 298 files / 1,833 tests passed before the action-bar extraction;
  the 28 affected unit tests passed after extraction. The additional export-gate
  regression then passed with all 15 gate tests.
- `snapshot_export_shortcut.spec.ts`: 6 passed across Chromium, mobile Chromium
  and mobile WebKit. The initial test used an incorrect accessible field name;
  corrected to the actual localized label and rerun successfully.
- Existing `exports_smoke`, `dataset_snapshot_confirm_workflows`,
  `dataset_snapshot_action_gating_preflight` and
  `dataset_snapshots_keyset_pagination` specs: 26 passed across desktop/mobile
  Chromium after the shared action-bar extraction.
- Localization, lint, formatting, design documentation, structural budgets,
  component/overlay contracts, mutations, UI strings and active-doc audits:
  passed. Snapshot actions now share one component for rows and cards instead
  of growing the oversized page or raising its budget.
- Build reports the existing advisory about chunks larger than 500 kB.
- Desktop and mobile implementation screenshots reviewed from synthetic
  Playwright fixtures; local artifacts are in
  `/Users/kerrycze/.codex/audits/snapshot-export-2026-10-17/`.

Browser fixtures cover member
Backup Center and administrator dataset detail, existing exports, cancel/reopen,
selected snapshots outside the first page, exact mutation payload and mobile
single taps. No live NFS mount or development-host deployment is claimed.

**Original status (2026-10-17):** local uncommitted change based on f3202feb.
It did not become a PR and was not included in the 2026-10-18 release.

## Completion — 2026-10-19

The maintainer reported the missing action on release `7860521f3082` and
requested removal of duplicated snapshot IDs. Recovered the unfinished work
in a fresh worktree on that main revision, preserving the original worktree.
Reconciled all intervening documentation and browser/type-test entries.
Each snapshot now shows its ID once beneath the creation date/time, on both
mobile cards and desktop rows. The action labels remain compact.

Verification on the completed candidate:

- Locked Node 24.21.0 / npm 11.19.0; Nix unavailable locally. The exact locked
  vpsAdmin terminology revision remains `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`;
  both guides were re-read from that immutable revision.
- `npm run ci:quick`: passed, including localization, structure, design docs,
  mutation/overlay contracts and TypeScript checks.
- `npm test`: 300 files / 1,856 tests passed. `npm run build`: passed with the
  existing large-chunk advisory.
- Targeted browser suite: 32 passed. After moving the remaining ID under the
  creation timestamp, the six new scenarios passed again across desktop
  Chromium, mobile Chromium and mobile WebKit, for member and admin views.
- On `dev.crucio.cz`, a fixture-backed check of the **actual deployed bundle**
  reproduced both defects: no export action and two IDs per row.
- Six scenarios passed on the **candidate production build** using the dev
  origin and existing response security headers. Candidate HTML/assets and
  deterministic API responses were supplied only in the test browser; the
  shared dev deployment was not changed. The initial preview accidentally
  served the old root HTML to the application's freshness check, causing
  reloads. The preview was corrected to serve the candidate index consistently;
  no application guard was disabled or changed.
- Creation submits the selected snapshot ID, not a live dataset; cancellation
  and reopening selects the new row, including snapshots beyond the picker's
  first page. Existing exports open their details without another creation.
- These tests do not certify a real NFS mount or backend export creation.

Implemented candidate screenshots with synthetic data on the dev origin:
[desktop](screenshots/2026-10-19-snapshot-export/desktop.png),
[mobile WebKit](screenshots/2026-10-19-snapshot-export/mobile.png).

KB impact was reviewed against `vpsfree-kb-contracts/docs/webui-change-workflow.md`.
Backup snapshot-list and export-creation captures are affected. Its existing
legacy PHP capture pins cannot be replaced with this React repository's SHA;
external KB capture refresh/publication is not claimed by these fixture tests.
No API changes or shared deployment were made. Prepared for PR review; merging
and release remain separate steps.
