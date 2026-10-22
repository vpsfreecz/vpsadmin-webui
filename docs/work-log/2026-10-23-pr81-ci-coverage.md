# 2026-10-23 — PR #81 CI coverage-count correction

PR: https://github.com/vpsfreecz/vpsadmin-webui/pull/81

The required nonbrowser job in run 39419193372 failed two script assertions
after the member-detail browser spec was adopted into strict TypeScript checks.
Both assertions expected 68 adopted / 197 deferred files; the valid inventory
now contains 69 adopted / 196 deferred files. Reproduced this locally before
editing.

Apply the same test-only correction already reviewed in PR #82, commit
71499e55: derive expected totals from the versioned inventory. The production
audit still checks exact compiler roots, source coverage and the immutable
deferred baseline. Negative tests still reject missing roots, unregistered
sources and edits to deferred files. No checks are disabled and no product,
API, workflow or dependency versions change.

Verification uses the pinned Node 24.21.0 fallback because Nix is unavailable
on this machine. Initial broad script/BFF runs also exposed missing local BFF
dependencies; installed them from the existing lockfile before rerunning.

Local verification passed:

- `npm run test:scripts`: 226 tests, including all 16 coverage-gate cases.
- `npm run test:bff`: 57 tests.
- `npm test -- --maxWorkers=2`: 300 files / 1,864 tests.
- `npm run ci:quick`: audits, formatting/lint and TypeScript checks.
- `npm run audit:design-docs` and `git diff --check`.
- `npm run build`: production build, with the existing chunk-size warning.

Status: prepared on the existing PR branch; not merged or deployed.
Remote checks will run on the pushed revision.
