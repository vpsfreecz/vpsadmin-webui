# 2026-10-19 — Conditional swap in VPS resource overview

## Change and rationale

REQ-017: VPS normally has no assigned swap, so a permanent zero-capacity tile
wastes space. The resource card now pairs allocated CPU with current CPU usage.
The latter follows the header semantics: `100 - cpu_idle`, two decimal places,
only for a running VPS and a finite numeric measurement between 0 and 100.
Unavailable or stale stopped-VPS measurements show a dash.

The existing conditional swap usage bar moves immediately below memory and
above disk. Zero/missing allocations show no swap tile or bar. Resource editing,
API requests, and backend allocation behavior are unchanged. Both member and
administrator overview pages share this card.

The existing localized CPU-usage label is reused; no catalog wording changes.
Terminology procedure reviewed against locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` using `git show` because local Nix
is unavailable. Node 24.21.0/npm 11.19.0 provided the local fallback toolchain.
The KB contract workflow currently maps the legacy PHP interface; no React
contract pin was substituted for the legacy source.

## Verification

- TypeScript typecheck, all 1,854 unit tests, and production build passed.
- Both existing VPS metrics overview Playwright tests passed in Chromium.
- Twenty local Playwright fixture checks passed: desktop Chromium and mobile
  WebKit, member and administrator scopes, each with zero swap, allocated swap,
  missing measurements, stopped VPS, and invalid CPU idle. Checks cover the
  conditional swap row, bar order, CPU usage fallback and horizontal overflow.
- Design documentation, lint, scoped formatting, and localization audits passed.
- Production build retains the existing large-chunk warning.
- Screenshots use synthetic local fixtures, not live API or deployment evidence.

## Screenshots

- [Desktop, no swap](../design/images/vps-resources-none-desktop.png)
- [Desktop, allocated swap](../design/images/vps-resources-assigned-desktop.png)
- [Mobile, no swap](../design/images/vps-resources-none-mobile.png)
- [Mobile, allocated swap](../design/images/vps-resources-assigned-mobile.png)

## Delivery

Prepared on `dev/vps-resource-swap` for review. No merge or deployment performed.
