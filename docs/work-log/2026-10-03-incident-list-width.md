# Fit incident reports to the available page width

Date: 2026-10-03. Requirements: REQ-010 and REQ-051.
Status: prepared, not merged or deployed.

The maintainer reported horizontal scrolling on the incident list in My view.
The desktop table forced the extra-large minimum width and mostly fixed columns.
Use the full available width and proportional columns, keeping the subject in
remaining space. Wrap full subjects/codenames, identifiers and IP addresses in
both desktop rows and narrow-screen cards instead of clipping or shortening
incident data. Keep filters, ownership, administrator columns and links intact.
No new UI text or API changes. Test data is synthetic; private report data from
the supplied screenshot is not copied into fixtures or public evidence.

## Verification

Pinned Nix Node 24.21.0 / npm 11.19.0 with clean root and BFF npm ci in the isolated
/data/webui-incidents-20261003/repo checkout.

- New layout regression plus existing incident filter/scope suite: 18 passed
  across desktop Chromium and mobile Chrome. Czech/English, dark/light, My/admin
  views, 360/393/1100/1280/1440/1920 CSS-pixel widths, long unbroken strings,
  IPv4/IPv6, all desktop columns, retained links and exact filters are covered.
  Assertions measure the table scroll container and rendered cells as well as
  the document so an internally scrolling or clipped table cannot pass.
- The new browser source is adopted into the strict E2E TypeScript inventory.
- Synthetic screenshots visually reviewed:
  [My desktop view](screenshots/2026-10-03-incidents/desktop.png),
  [admin desktop view](screenshots/2026-10-03-incidents/admin.png),
  [mobile view](screenshots/2026-10-03-incidents/mobile.png).
- All npm run ci:pr stages passed: ci:quick (audits, lint/format and strict
  typechecks), ci:tests (222 script, 57 BFF and 1,643 unit tests), and production
  build. Existing large-chunk warning only. Final documentation audit passed.
- Validation corrections: replaced lint-rejected arbitrary widths with fractional
  utilities, updated the E2E inventory assertion from 20 to 21 adopted files,
  and installed the isolated BFF dependencies before rerunning its script tests.
  No gates were disabled or weakened.

No live incident data or API mutations were used. No deployment performed.
