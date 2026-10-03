# Port legacy PR528 to the canonical WebUI repository

Date: 2026-10-03. Requirement: REQ-028. Prepared, not merged or deployed.

Requested port: https://github.com/Kerrycek/clankerdev/pull/528.
Original commits: `d49ca409aebbb80471e24d4f44e485c7cd1cc1be` and
`94784cf4c93253bc8996f7b15b8dbfe3e96b0899`, authored by Michal Janoušek.
Their combined feature diff is adapted on top of canonical PR10, retaining its
accepted toast, API-parity corrections, strict E2E adoption and uncertainty tests.
This PR depends on PR10 and should be merged after it.

The searchable bounded destination dropdown loads every ascending-ID page of
active hypervisor nodes, excludes the source and blocks submission after an
incomplete/failed inventory. Retry, keyboard selection and focus return remain.
Timing/reason and execution/IP options are visible directly, and confirmation
names the VPS and destination. Unsupported single-VPS `stop_on_error` stays removed.

The original dated work log is historical evidence; its old gate results do not
certify this port. Current locked API/localization guide revision remains
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The import preserves authorship and
references both original commits. No original PR is closed or merged.

## Verification

Pinned Nix Node 24.21.0 / npm 11.19.0, clean npm ci, isolated source under
/data/webui-port528-20261003/repo. Runtime candidate fa4de6e:

- npm run ci:pr passed: audits, strict typechecks, script/BFF checks, 1,647
  unit tests and production build. Existing large-chunk warning only.
- Targeted migration/admin-migrate Playwright cases: 22 passed across desktop
  Chromium and mobile Chrome, including accepted toast, all visible options,
  full paging, failed inventory/retry and rejected/ambiguous mutation outcomes.
- Desktop/mobile captures visually reviewed, synthetic fixture data:
  [desktop picker](screenshots/2026-10-03-migration-picker/desktop-picker.png),
  [mobile form](screenshots/2026-10-03-migration-picker/mobile-form.png).

Tests use synthetic API fixtures; no real migration or service deployment is performed. Administrator-only
React form changes do not change legacy PHP KB navigation/capture contracts.
