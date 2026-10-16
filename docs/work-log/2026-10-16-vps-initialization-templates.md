# VPS creation and reinstall: initialization templates

Request: [Discourse report 372/3](https://discourse.vpsfree.cz/t/nove-webove-rozhrani-pro-vpsadmin-new-web-interface-for-vpsadmin/372/3).
Requirement: REQ-023. Prepared on `dev/vps-saved-init-templates` from
`cce681424b866f6a51cbc0a1e4daa226ed33fc07`; not merged or deployed.

## Findings and implementation

The four report screenshots show the legacy interface offering saved User data
and custom initialization for creation/reinstall. The new create form lacked
initialization entirely, while reinstall only accepted inline content. The
existing API already accepts both variants; no backend changes are required.

- Both forms now share an optional initialization section with custom content
  and saved User data. All six existing script/cloud-init/NixOS formats remain
  available. Initialization is disabled by default.
- Saved choices use the actual VPS owner, not the browsing administrator. Members
  omit the blacklisted `user` filter; admins filter by owner, including in My view.
  Cache keys and selected IDs bind to that owner; changing owner clears the choice.
- The picker has loading, error/retry, empty and cursor-pagination states. It
  omits unsupported text search and links to existing template management.
- Saved mode submits only `vps_user_data`; inline mode submits only format/content;
  disabled mode omits all three. Blank inline text blocks submission, while
  nonblank script/YAML bytes retain indentation and trailing newlines.
- Reinstall retains destructive confirmation and the selected template after a
  rejected request. Creation retains snapshot, owner and uncertain-outcome guards.
- Create validation field navigation moved into a focused helper to keep the
  page inside its existing structural budget; no budget exemptions were added.

## Contract and localization evidence

API resources and terminology/localization guides were read at the exact locked
vpsAdmin revision `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
Nix is unavailable on this host, so those exact-revision sources were fetched
from GitHub; no floating branch or sibling checkout substituted for them.
Node 24.21.0/npm 11.19.0 match the repository's locked toolchain.

Reviewed the separate KB contract workflow and its `userdata.menu` binding.
That binding targets legacy PHP files (`webui/forms/vps.forms.php` and
`webui/pages/page_adminm.php`), which this change does not touch. This PR updates
frontend workflow/API documentation and contains synthetic browser evidence;
it does not claim to update or certify live KB pages/screenshots, publish wiki
content, or pin a frontend commit into the backend-only contract.

## Verification

- `npm run docs:inventory`: regenerated; no inventory diff.
- `npm run ci:quick`: passed, including strict E2E/BFF/tooling type checks and
  structural, localization, documentation and mutation audits.
- `npm run ci:tests`: 226 script tests, 57 BFF tests and 1,805 unit tests
  (297 files) passed.
- `npm run build`: production frontend build passed (existing large locale chunk
  warning remains).
- Playwright: new initialization cases cover member create, pagination beyond 50,
  inline byte preservation, owner changes, mismatched-owner response filtering,
  empty/error/retry, and saved-template reinstall rejection/retry. The new spec
  runs in desktop Chromium, mobile Chrome and iPhone WebKit and participates in
  PR smoke selection and strict E2E type coverage.
- Focused Playwright run: 121 passed, including the new cases and related create
  and lifecycle regressions. API fixtures validate frontend behavior and request envelopes; they do not
  certify execution of cloud-init inside a real VPS.
- Czech dark-theme desktop/mobile captures are attached to the Playwright report
  by the member-create scenario, with synthetic data only. English controls are
  exercised by the other cases. Horizontal overflow is asserted on the capture.
- Hook check: no declared hook framework or configured hooks path found.

No production mutations, deployment, real VPS creation/reinstall, API changes,
or Discourse reply were made. A real isolated-API initialization run and the
maintainer's review remain distinct from these fixture checks.
