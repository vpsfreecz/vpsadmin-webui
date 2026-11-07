# Remove duplicated VPS access and runtime summary

DET-05, from panika's Discourse post 15, asks for one primary location for SSH,
console and runtime information. Remove the member overview's Access card:
it repeats the header SSH/copy action, console shortcut, uptime and load.
Keep header actions, navigation, live runtime summary and historical charts.
The administrator overview already omits this card and remains covered.

REQ-015, REQ-017 and REQ-020. No API, capability or mutation contract changes.
Removing the shared JSX removes the duplicate in both languages. No new wording
or catalog changes. Locked terminology guide/procedure reviewed at vpsAdmin
revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff.

Both topic and cumulative preview pass `npm run ci:quick`, 28 focused VPS
unit tests and the final E2E type/design audits. The Vite build passes.
Sixteen working-build Playwright cases pass; the prior exact be979414 build
fails all eight member cases and passes all eight unchanged admin cases.
The final clean package and paired promotion remain pending at commit time.
Synthetic Playwright cases cover
member/admin, running/stopped, Czech dark and English light, desktop Chromium
and mobile WebKit. Fixtures do not certify real API permissions or console I/O.
External knowledge-base contract checkout was not found under the current
workspaces; localized external KB screenshots are not certified by these tests.


| State / synthetic fixture | Desktop | Mobile WebKit |
| --- | --- | --- |
| Running, Czech dark | [Before](assets/vps-overview-duplicates-running-before-desktop.png) / [After](assets/vps-overview-duplicates-running-after-desktop.png) | [Before](assets/vps-overview-duplicates-running-before-mobile.png) / [After](assets/vps-overview-duplicates-running-after-mobile.png) |
| Stopped, Czech dark | [Before](assets/vps-overview-duplicates-stopped-before-desktop.png) / [After](assets/vps-overview-duplicates-stopped-after-desktop.png) | [Before](assets/vps-overview-duplicates-stopped-before-mobile.png) / [After](assets/vps-overview-duplicates-stopped-after-mobile.png) |

The removed card also exposed stale uptime/load for stopped VPSes; the retained
header correctly shows unavailable runtime values instead. No real VPS operations
or authenticated production requests were made in these fixture checks.
