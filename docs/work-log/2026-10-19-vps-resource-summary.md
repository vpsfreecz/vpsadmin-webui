# 2026-10-19 — Remove duplicate VPS runtime metrics

## Change and rationale

REQ-017: the maintainer requested removing CPU usage, uptime and load from the
Resources card because the VPS header already displays them. Allocated CPU now
uses one full-width tile; memory, optional allocated swap and disk remain usage
bars. No unrelated replacement metric is added just to fill space. This
supersedes the CPU-usage pairing introduced in the earlier resource-swap change.
The shared card applies to member and administrator views. Resource editing,
API requests and the runtime header are unchanged.

No translation wording or catalog changes. The localization procedure and guides
were reviewed at locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Local Nix is unavailable, so the
exact Git revision supplied the guides and the existing Node 24 fallback
supplied the toolchain. Root dependencies were installed with `npm ci`.

## Verification

- TypeScript, all 1,859 unit tests, and the production build passed (existing
  large-chunk warning remains).
- All 10 targeted Playwright cases passed in desktop Chromium and mobile WebKit,
  covering cs/en, member/admin views, runtime header behavior, absent duplicate
  metrics, zero/allocated swap, bar order and horizontal overflow.
- E2E core typecheck, design documentation, lint, scoped formatting, translation
  audit and diff whitespace checks passed.
- No hook framework or custom Git hook path is declared.

Screenshots use local synthetic API fixtures, not a deployed environment:

- [Desktop](../design/images/vps-resource-summary-desktop.png)
- [Mobile](../design/images/vps-resource-summary-mobile.png)
- [Desktop with swap](../design/images/vps-resource-summary-swap-desktop.png)
- [Mobile with swap](../design/images/vps-resource-summary-swap-mobile.png)

These checks do not certify a live API or deployment.

## Delivery

Prepared on `dev/vps-resource-summary` for review. Not merged or deployed.

## CI follow-up

Run 39323166381 failed in desktop and mobile Chromium because the older admin
VPS overview matrix still required the removed runtime block inside Resources.
This was a missed test update in this PR. Both jobs failed only that case;
526 desktop and 468 mobile cases passed, and the WebKit job passed.

Update the matrix to require uptime, load and CPU usage in the header and reject
the duplicate resource labels/block. Keep all navigation, layout and data-scope
assertions. Adopt the touched spec into strict E2E TypeScript coverage (68
adopted, 197 deferred), including the existing coverage-count tests.

All six matrix cases passed locally across desktop and mobile Chromium.
Strict E2E typing passed. The first full script run found missing local BFF
dependencies; install them with `npm ci --prefix bff` before rerunning.
The original failed run remains historical; the pushed fix needs fresh CI.
The rerun passed all 226 script tests. Lint, scoped formatting, design-doc audit
and diff whitespace checks also passed. Application code is unchanged by this
follow-up; no merge or deployment was performed.
