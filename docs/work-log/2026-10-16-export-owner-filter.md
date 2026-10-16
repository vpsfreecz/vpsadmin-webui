# Discoverable export owner filtering and member shortcut

Requirement: REQ-048. Prepared on `dev/export-owner-filter` from canonical main
`cce681424b866f6a51cbc0a1e4daa226ed33fc07`. Not merged or deployed.

## Problem and change

Entering a member ID into the export search opened that export ID. The supported
owner filter was hidden in an advanced drawer, and member detail had no shortcut
to exports. Move the owner ID/login lookup into the visible filter bar and remove
the now-redundant single-field drawer. Offer a distinct owner action alongside
Open export for numeric smart-input suggestions. Keep the existing direct-export
Enter behavior and `user:` syntax; do not guess between colliding object IDs.

Global administrator member detail now links directly to the URL-filtered export
list. Both controls respect the existing global-admin boundary; support and My
view retain their existing API scope. Preserve reset/pagination/history behavior.
Wrap member-header actions within a bounded width and stack them on smaller
viewports so the additional shortcut does not squeeze the member name.
Keep filters mounted while list requests load or fail, so multi-digit ID typing
does not lose focus as each prefix triggers a query. No API changes.

## Verification and evidence

- Browser coverage extends the adopted export contract suite: cs/en visible
  owner fields, numeric typing with focus retention, login selection, explicit
  numeric owner/export choices, cursor reset, pagination, reload, clearing,
  member-detail navigation/back/forward, and support/My-view restrictions.
- Desktop and mobile screenshots use synthetic fixtures/documentation IPs;
  they do not certify live API data or a deployment.
- `npm test`: 1,794 tests across 296 files passed.
- `npm run ci:quick` and `npm run build` passed, including typechecks,
  localization, structural and documentation audits. `git diff --check` passed.
- Focused Playwright export contract suite: 39 tests passed in Chromium,
  mobile Chrome and mobile WebKit. Screenshot inspection caught and corrected
  member-name squeezing before final capture; title wrapping is asserted.
- No configured hooks path or declared commit-hook framework was found.
- Screenshots and logs are retained locally under the ignored
  `work/audits/export-owner-20261016/` directory and shared in the review chat.
- Nix is unavailable on this workstation. Use the exact locked Node 24.21.0 /
  npm 11.19.0 runtime with `npm ci`, including the BFF typecheck dependencies.
- Localization guides were read from the exact flake-locked vpsAdmin Git object
  `a65a4dfeb92a59df4a80a737a20bcbf8558793ff` using `git show`, because Nix input
  resolution is unavailable. Both Czech and English catalogs were reviewed.
- Reviewed the KB WebUI change workflow and Clankerdev navigation prototype.
  The legacy PHP contract and node-history/configuration prototypes do not bind
  these export filters or member shortcuts. No KB publication is included or
  certified by these fixture screenshots.

Next step: maintainer review of the focused PR, separately from the pending
export-detail layout PR #46.
