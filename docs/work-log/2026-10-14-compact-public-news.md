# 2026-10-14 — Compact public news

## Request and observed cause (REQ-054)

The maintainer compared `https://newadmin.vpsfree.cz/news` with the legacy
`https://vpsadmin.vpsfree.cz/?page=log` and requested less space around short
announcements. Read-only browser inspection of both public pages confirmed
that legacy uses dated table rows, while the new UI gives every one-line message
a separate card, date/ID header, divider and padded body.

## Change

Use one ordered list in a shared card. At desktop widths, a consistently aligned
date column sits beside the complete message. On mobile, the date moves above
the text. Compact vertical padding, separators and alternating surfaces make
short entries scannable without shrinking the existing message font. Remove
visible internal IDs and repeated card headers. Long messages and links wrap
without truncation; existing HTML sanitization, language selection, ordering,
fetch behavior and loading/error/empty states are retained. No API changes.

## Verification and release status

Prepared in `dev/compact-public-news` from main cce6814. Not merged or deployed.
The live pages were inspected anonymously; implementation screenshots and tests
use local synthetic HaveAPI fixtures, not production data.

Use official SHA256-verified Node 24.21.0 / npm 11.19.0 (matching the locked
versions); local Nix is unavailable. Dependencies installed with `npm ci` in the
root and BFF. No active Git hooks or hook framework are declared.

- `npm run ci:quick`: passed (locked versions, lint/format, audits and strict types).
- `npm test`: 296 files / 1,794 tests passed.
- `npm run test:scripts`: 226 passed.
- `npm run build`: passed; existing large-chunk advisory remains.
- Playwright `news_compact.spec.ts`, Chromium + mobile Chrome: 12 passed.
  Covers cs/en and light/dark, desktop/mobile row density, untruncated multiline
  content, long-URL wrapping without horizontal overflow, link destinations,
  date/missing-date rendering, and empty/error states.
- New browser spec is adopted into strict E2E TypeScript coverage; the explicit
  coverage counts are updated. Browser failures in the first run came from a
  new test incorrectly assuming the existing Alert component has an ARIA alert
  role; the assertion now verifies the visible error/empty message instead.

Synthetic implementation screenshots:
[desktop light](assets/compact-news-20261014/desktop-light.png),
[desktop dark](assets/compact-news-20261014/desktop-dark.png),
[mobile light](assets/compact-news-20261014/mobile-light.png),
[mobile dark](assets/compact-news-20261014/mobile-dark.png).
