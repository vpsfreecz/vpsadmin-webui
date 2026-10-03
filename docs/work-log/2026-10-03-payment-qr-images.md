# Restore embedded payment QR images

Date: 2026-10-03. Requirement: REQ-052. Prepared, not merged or deployed.

The screenshot showed empty image frames for CZK and EUR instructions. Source
inspection found both payment image validation and shared attribute validation
reject every data URL. The existing legacy payment browser fixture already used
an embedded PNG but only asserted element visibility and maximum dimensions,
allowing an empty img to pass. The API returns administrator-configured ERB HTML;
the frontend must preserve supported QR image bytes rather than recreate payment
information. No authenticated production response or payment mutation was needed.

Add an explicit PNG-only option to URL validation, opted in only for img.src in
payment instruction HTML. Require base64, PNG signature and a 1 MiB encoded URL
bound. Default URLs, links, news, SVG, scripts and event-handler restrictions stay
unchanged. Existing CSP already allows data images; no CSP broadening is needed.
No UI text, localization behavior, amounts, account numbers or API changes.

## Verification

Pinned Nix Node 24.21.0 / npm 11.19.0, clean root and BFF npm ci in
/data/webui-payment-qr-20261003/repo. All ci:pr stages passed: audits/lint/format,
application/tooling/strict E2E/BFF typechecks, 222 script tests, 57 BFF tests,
1,654 unit tests (including URL/HTML security cases) and production build.
Existing large-chunk warning only.

Targeted payments_page and payment_qr_images Playwright suites: 12 passed across
desktop Chromium and mobile Chrome, cs/en, dark/light. Tests check exact preserved
sources, successful decoding/natural size, black/white pixels, layout containment,
existing localization, clipboard and pagination behavior. Both browser suites
are adopted into the strict E2E inventory (22 adopted / 224 deferred).
The new fixture waits for locale bootstrap before inspecting the replaced HTML.

Synthetic implementation captures visually reviewed:
[desktop](screenshots/2026-10-03-payment-qr/desktop.png) and
[mobile](screenshots/2026-10-03-payment-qr/mobile.png).
New synthetic QR codes encode plain test labels, not bank payment orders. Original
private screenshot data is not copied into the new fixtures or captures.

## Deployment follow-up — 2026-10-03

Merged and deployed to all three WebUI sites in clean release `f123a7fb`.
See the [completed release receipt](2026-10-03-three-site-release.md) for
exact provenance, CI results, runtime verification, rollback and limitations.
