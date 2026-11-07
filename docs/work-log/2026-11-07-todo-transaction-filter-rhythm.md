# Align transaction chain filter controls

UX-03 authorizes consistent field and adjacent-action dimensions. This follow-up
selects the transaction chain filter row, where the smart input is 44px but
advanced and clear controls are 36px and copy-link is 32px on desktop.
The existing VPS filter alignment remains a separate change in PR128.

Give the four filter actions the input height. Use the shared Button for help
so it inherits keyboard focus and touch behavior. Preserve filtering, active
chips, URLs, help dialogs, advanced dialogs and copy feedback.

Requirements REQ-010 and REQ-073. The user authorized separate draft PRs against
kerrycek-021126 and paired previews on dev.crucio.cz and clankerdev.vpsfree.cz.
The agent selected this bounded page within the approved umbrella task.
Approval and merge remain with the maintainer.

## Verification

Eight Playwright cases pass on the working preview in Chromium and mobile
WebKit; all eight fail on the prior exact 562c0bcf build at the original
36px action/help control. The regression checks matching control heights,
viewport overflow, help and advanced dialogs, clearing and exact copied URL
in Czech and English with both themes on Chromium and mobile WebKit.
Fixtures use synthetic member data and cannot certify live API permissions.


The topic passes `npm run ci:quick` and all 37 transaction unit tests.
The production Vite build passes. Root filesystem exhaustion prevented entering
a fresh Nix shell, so these checks use the already installed locked Node 24.21.0
and npm 11.19.0, with caches and artifacts on `/data`.
The final clean package and paired deployment remain pending at commit time.

| Synthetic fixture | Before | After |
| --- | --- | --- |
| Desktop Chromium | [Before](assets/todo-transaction-filter-before-desktop.png) | [After](assets/todo-transaction-filter-after-desktop.png) |
| Mobile WebKit | [Before](assets/todo-transaction-filter-before-mobile.png) | [After](assets/todo-transaction-filter-after-mobile.png) |

This covers the transaction chain page only. UX-03 remains partial; other forms
are not certified by these checks. The screenshots contain synthetic member data.
