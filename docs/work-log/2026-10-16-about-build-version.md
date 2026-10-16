# Loaded WebUI revision and About page

Request: show the current commit compactly at the bottom of the left menu and
provide legal/source information and credits for the new UI, replacing legacy
PHP template credits. Credit Jakub Skokan, Pavel Šnajdr and Michal Janoušek.

Implementation: the build-info plugin embeds the same metadata it emits to
build-info.json. The footer uses the loaded bundle's revision, not a fresh HTTP
request that could belong to a later release. Unknown builds have no fabricated
commit link; local changes are marked. Public /about remains accessible without
login and links to the repository and version-specific package metadata.

Credit names follow the maintainer's request; approximate contribution
percentages are deliberately omitted. Describe AI as a development tool rather
than a copyright holder. package.json currently declares ISC but the repository
has no standalone LICENSE file. The page accurately reports the declaration;
it does not add a license grant, assign copyright, or invent copyright years.
Third-party packages retain their own notices. Legacy Xtemplate/Adminizio
credits are not copied into the new React UI.

Terminology reference: locked vpsadmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
Nix is unavailable on this host. Both guides were read with git show at that
exact revision from the local vpsadmin object database, not from its working
tree. Checks use available Node24.21.0. No API changes.
The external vpsadmin-kb-captures workflow checkout is not available at the
expected local path; external KB screenshots/contracts are not certified here.

Verification: 1,812 unit tests across 298 files and 18 Playwright cases passed
(Chromium, mobile Chromium, mobile WebKit; cs/en, guest/member/admin).
TypeScript, E2E type coverage, i18n audit, lint, production build and design-doc
audit passed. All 226 script tests, tooling typecheck and CSP audit passed.
The new browser test was added to the mandatory E2E type inventory and its
expected coverage count was updated from 53 to 54 (no tests excluded).
Built JS contains the same commit as emitted build-info.json.
Browser evidence uses synthetic API fixtures
and the actual local implementation; it is not a deployment to dev or production.

Status: prepared for review, not merged or deployed. Implements REQ-072.

Maintainer clarification: About is a low-emphasis text link outside the main
navigation, alongside the commit in a separate footer. Both links use muted
text instead of the default orange link color.

Screenshots (local implementation with fixtures, before commit):
- [Desktop footer](screenshots/2026-10-16-about-build-version/desktop-footer.png)
- [Mobile footer](screenshots/2026-10-16-about-build-version/mobile-footer.png)
- [About](screenshots/2026-10-16-about-build-version/about-cs.png)
- [Mobile About](screenshots/2026-10-16-about-build-version/about-mobile.png)
