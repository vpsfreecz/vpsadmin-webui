# Port legacy PR530 maintainer documentation

Date: 2026-10-03. Base: canonical main 3f31fce5cd58f3ace204c27e917b85527bfc08c0.
Source: [Kerrycek/clankerdev PR530](https://github.com/Kerrycek/clankerdev/pull/530),
head e0f99d8f733025b18c5fa7283871d57edc7c7c85; original author Michal Janoušek.

## Changes and rationale

Import the action contracts, configuration/development/troubleshooting/handover
handbooks, historical review and synthetic visual references, requirement evidence
matrix, reverse API-domain map and stricter link/anchor/coverage audit with negative
tests. Preserve the historical PR527 receipt included in the source ancestry.

Reconcile the old review with all 70 current requirements and 64 API modules.
Retain canonical BFF-required bootstrap, session-bound impersonation, systemd
credential files, paired Nix packages/service, and existing three-site receipts.
Old deployment instructions point to current operations guides; preserve the
stale-candidate rollback guard without reintroducing obsolete deployment commands.
Historical screenshots, test totals and findings are explicitly dated.
Canonical PR9 (presets), PR10 (migration feedback/parity), PR11 (operation names)
and [PR12, the PR528 picker port](https://github.com/vpsfreecz/vpsadmin-webui/pull/12), remain pending and are not represented as deployed.

Backend reference: a65a4dfeb92a59df4a80a737a20bcbf8558793ff, from the locked
vpsAdmin source /nix/store/030czw9xwvihmw4l24p97d5r2xxd71vi-source.
No runtime change, deployment, migration, email or resumed issue automation.

## Verification

Pinned Nix Node 24.21.0 / npm 11.19.0 with clean root npm ci in an
isolated source directory (/data/webui-port530-20261003/repo):

- npm run ci:pr passed: all audits/typechecks, 226 script tests, 57 BFF tests,
  1,643 unit tests and production build. Existing large-chunk warning only.
- node --test scripts/design-docs.test.mjs: 14 passed, including negative
  anchor/evidence/module coverage cases and preserved Gitless/untracked checks.
- npm run audit:design-docs: 55 documents, 70 unique requirements,
  256 route declarations, 64 API modules. Rerun after final prose/receipt edits.
- All five imported synthetic reference images inspected; retained as dated
  historical evidence, not current UI or production screenshots.
- Source audit scripts are exercised by the negative tests; no live browser
  certification is claimed for this documentation-only port.

The original source ancestry contains 028d0f7f, 5e2ab2d3, d660b019, deb30765,
adcd8256, baf47380, deceb6c7 and e0f99d8f. It remains available in the source PR;
the consolidated adapted port retains its original author and historical logs.
Independent security review, authenticated release acceptance, private evidence
transfer and broader legacy parity remain open; this port does not certify them.
