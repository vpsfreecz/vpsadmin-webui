# VPS migration acceptance feedback and option parity

Date: 2026-10-03. Requirements: REQ-023 and REQ-028.
Status: prepared for review; not merged or deployed.

The maintainer reported that the migration form refreshed and its accepted
message appeared below the fold. Replace that inline success message with the
shared fixed toast, name the submitted VPS, retain it until dismissed and offer
Open tasks. Keep the existing action tracking, refresh, draft, error handling and
uncertain-operation lock. Only clear the confirmation after acceptance.

## Locked-source parity audit

API and Czech terminology reference:
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, resolved through the locked Nix
`vpsadmin` input. Read both `docs/i18n-cs.md` and
`docs/agent-instructions/localization.md`. Reviewed English and Czech receipts.
Compare `webui/forms/vps.forms.php` (migration step 2),
`webui/pages/page_adminvps.php` (`migrate-submit`),
`api/lib/vpsadmin/api/resources/vps.rb` (`Migrate`) and
`api/lib/vpsadmin/api/operations/vps/migrate.rb` at that revision.

| Legacy control | React control / payload | Result |
| --- | --- | --- |
| Target node | Node lookup / `node` | Present |
| Maintenance window | Timing: maintenance / `maintenance_window` | Default within the same location/environment |
| Immediate migration | Timing: now | Default for a location/environment change |
| Finish on day, finish from | Custom weekday and hour / `finish_weekday`, `finish_minutes` | Both required; Sunday is 0, hour converts to minutes, including midnight |
| Cleanup data | `cleanup_data` | On by default |
| No start | Advanced / `no_start` | Off by default |
| Skip start | Advanced / `skip_start` | Off by default |
| Send emails | `send_mail` | On by default |
| Reason | Advanced / `reason` | Optional, trimmed |
| Transfer IP addresses | Environment changes / `transfer_ip_addresses` | Correct initial model default from on to off to match legacy |
| Replace IP addresses | Location changes / `replace_ip_addresses` | Off by default |

No control from the supplied legacy screen is missing. The current API requires
custom weekday and minutes together and rejects combining them with maintenance
window; the React timing selector enforces that relationship. Its hourly precision
matches the PHP selector. The legacy submit handler still mentions `rsync` and
`mounts_to_exports`, but neither is a form control or an accepted input in the
locked VPS migration API. The API's `swap` is fixed to `enforce`, not a user choice.

Remove the React-only `stop_on_error` control, form field and payload type: it
belongs to node migration plans, not single-VPS migration. Keeping it would promise
an option the API neither declares nor passes to the operation. Keep the related
migration-plan controls elsewhere intact.

Legacy Clankerdev PR528 also redesigns destination selection and form layout.
This focused fix does not import that separate redesign; its inventory/picker
improvements still require their own port and review. No claim of full migration
workflow or destination-inventory certification is made here.

## Verification

All 12 targeted migration browser cases passed on Chromium desktop and mobile,
in English and Czech where receipts differ. Synthetic screenshots were visually
reviewed: [desktop](screenshots/2026-10-03-migration/desktop-cs.png) and
[mobile](screenshots/2026-10-03-migration/mobile-cs.png). All PR gate stages passed using the locked Nix Node 24.21.0/npm 11.19.0
shell: audits/lint/format, application/tooling/E2E/BFF types, 222 script tests,
57 BFF tests, 1,644 unit tests in 281 files, and the production build.
Commands: `npm ci`, `npm run docs:inventory`, `npm run ci:pr`; after fixing the
newly adopted spec's strict environment-variable access, resumed with
`npm run typecheck:e2e:core`, `npm run typecheck:bff:core`,
`npm run ci:tests` and `npm run build`. The isolated runner initially lacked BFF
dependencies; reused the existing dependency tree only after verifying an
identical BFF lockfile, then reran the affected test stage successfully.
`npm run audit:design-docs` also passed after adding the screenshots.

Browser command: `node scripts/playwright.mjs test
e2e/specs/app/vps_lifecycle_tab_actions.spec.ts --grep "migration|admin migrate"
--project=chromium --project=mobile-chrome --workers=2 --reporter=line`.
The fixture server and build directory were isolated from deployed services. The browser
spec is adopted into strict E2E TypeScript coverage rather than updating its
previous deferred hash. Fixtures cover accepted receipts above a scrolled form,
Tasks access, retained drafts, rejection/missing receipt, and exact option payloads.
No real VPS is migrated. The user's private screenshot is not published.

KB impact: this is an administrator-only React action; no public member
navigation or legacy PHP page changes. Read the separate KB change workflow
and searched its contract/capture bindings: no migration control or capture
is bound there. No KB repin/publication is needed for this change; these React
fixture tests do not certify the external KB.
