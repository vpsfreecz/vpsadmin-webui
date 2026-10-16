# Simplify About credits

The maintainer rejected per-person role descriptions and requested removal of
both the generic thank-you paragraph and AI-tool commentary. Follow the concise
legacy About style: keep Jakub Skokan, Pavel Šnajdr and Michal Janoušek in a plain
list with years, with no claims about their individual roles or contribution proportions.
The section is titled “Autoři” / “Authors”, as requested in a follow-up.
The change applies to Czech and English and removes the unused catalog keys.
Version/source/licensing information and the quiet navigation footer remain.

Reference inspected: https://vpsadmin.vpsfree.cz/?page=about on 2026-10-16.
Its old PHP/template copyright notices are not copied into the React interface;
Jakub’s 2012–2026 and Pavel’s 2008–2014 ranges match that page; Michal’s
2026 starting year was supplied explicitly by the maintainer in a follow-up.
The list does not add a new copyright declaration. Implements REQ-072.

Read both localization guides from the Nix-resolved locked vpsadmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` on build.vpsfree.cz.
No API or deployment configuration change is included.

Status: prepared for review, not merged or deployed.

The existing 18 About/footer Playwright scenarios passed across desktop Chromium,
mobile Chrome and mobile WebKit. After the requested years and shorter heading were added, all six
public cs/en scenarios passed again. Screenshots show the local implementation
with synthetic API/session fixtures; they are not a dev or production deployment.
Reviewed the visible names, years and absence of the removed paragraphs in both
languages, plus desktop and mobile layout. No new tests were added for this
small content change. The external vpsadmin-kb-captures checkout is unavailable,
so its screenshot contracts are not certified here.

- [Desktop](screenshots/2026-10-16-about-simple-credits/desktop.png)
- [Mobile](screenshots/2026-10-16-about-simple-credits/mobile.png)

The locked Nix development shell passed `ci:quick`, all 1,829 unit tests in 298
files and the production build. Local final i18n and design-document audits also
passed after the shorter heading and screenshot documentation were added.
