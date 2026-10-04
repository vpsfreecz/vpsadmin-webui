# Payment QR generator blocked by newadmin CSP — 2026-10-04

Requirements: REQ-052, REQ-069. Prepared for review, not merged or deployed.

## Diagnosis and correction of previous evidence

The user still saw empty QR frames after PR15 and after changing their monthly
amount. Read-only inspection of the production payment-instructions template
confirmed that both translations use external PNG URLs at
`https://vpsfree.cz/nastroje/qr.php`, with country, amount and reference queries.
The public generator returned HTTP 200 and a valid PNG using synthetic parameters.
Newadmin's live `img-src` allowed only self, data and OpenStreetMap, so the browser
blocked the generator. Clankerdev's older policy permits HTTPS images.

PR15 fixed embedded PNG support but its synthetic data-URL fixtures did not match
this production template. It therefore did not fix the reported production case.
The amount does not influence CSP authorization. No API, database, payment amount,
authentication state or service configuration was changed during investigation.

## Change and deployment dependency

The reusable NixOS module now exposes `security.imageSources`, empty by default,
for reviewed HTTPS origins or paths. It rejects credentials, non-HTTPS sources,
wildcards, queries, fragments and CSP directive injection. The companion site
configuration must explicitly set `[ "https://vpsfree.cz/nastroje/qr.php" ]`.
This permits the generator endpoint and its API-supplied query parameters without
allowing all images from its origin or changing connect/script permissions.

The site input must first be updated through `confctl inputs` to the approved
WebUI release containing this option. Apply the site setting with that release;
merging this WebUI PR alone does not change the live CSP. There is no API/database
migration. The previous source pin and site configuration are the rollback pair.

## Verification

- Pinned Nix Node 24.21.0/npm 11.19.0; clean npm ci in an isolated `/data` checkout.
- Application typecheck, 1,699 unit tests / 284 files, production build passed.
- Nix module evaluation: valid/default/coexistence and invalid image-source
  assertions passed, including a path-qualified `img-src` in rendered nginx.
- Design-documentation and CSP audits, strict E2E typecheck and static CSP
  script regression passed.
- Eight Playwright cases passed: embedded/external CZK/EUR images, cs/en,
  desktop/mobile. External responses are synthetic QR label PNGs; tests enforce
  the module fixture's image CSP, preserve query parameters, require decoding
  and dimensions, reject an unrelated path and check horizontal containment.
- Additional read-only Chromium experiment used the live newadmin CSP and the
  actual public generator with synthetic parameters. Original policy: both images
  failed with `img-src` violations. Adding only the generator path: CZ PNG decoded
  at 145×145 and SK PNG at 320×320, with no CSP violations. This changed only an
  intercepted diagnostic document in the test browser, not the deployed service.

Reviewed synthetic implementation captures:
[desktop](screenshots/2026-10-04-payment-qr-csp/desktop.png) and
[mobile](screenshots/2026-10-04-payment-qr-csp/mobile.png).
They contain plain test labels, not production payment orders or personal data.

Full site build and activation remain release checks after selecting the approved
input. These browser fixtures and module evaluations are not deployment evidence.
