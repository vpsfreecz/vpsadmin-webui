# 2026-10-20 — Admin security advisory table spacing

Requirement: REQ-055. Status: prepared for review; not merged or deployed.

The admin advisory table omitted cell padding, leaving titles and Open actions
against the card edges. Its default centered headers also disagreed with the
left-aligned content. Add 16 px horizontal and 12 px vertical cell padding,
left-align descriptive headings, and retain right alignment for counts/actions.
Use the existing muted header typography and separator, clip row backgrounds to
the rounded card, and remove the unnecessary 1280 px table minimum. Keep the
advisory column at least 256 px wide so mobile rows do not become excessively tall. This is scoped to the
advisory list; the shared table primitive and API behavior are unchanged.

The existing table card contains horizontal scrolling on mobile. Layout previews
use synthetic admin data, published/retracted/draft rows, long titles, CVEs and
missing counts in Czech/dark and English/light themes. They do not certify live
API behavior or indicate deployment.

Verification (local Node 24 fallback; Nix is unavailable on this workstation):

- `npm ci`, `npm run typecheck`, `npm run build`: passed.
- `npm test -- --maxWorkers=2`: 300 files, 1,859 tests passed.
- `npm run lint`, `npm run format:check`, `npm run audit:design-docs`: passed.
- Existing `security_advisories_admin.spec.ts` on desktop Chromium and mobile
  Chromium: all 12 cases passed, including management and role restrictions.
- A temporary Playwright capture harness (not added to the maintained suite)
  checked Czech/dark and English/light on both viewports: four cases passed.
  Verified no page overflow, the full table fits at 1440 px, 16 px edge padding,
  and Open navigation after scrolling the mobile table. The final CSS adjustment
  was recaptured and checked on both viewports.

Synthetic implementation screenshots:

- [Czech desktop](../design/images/advisories-table-spacing/cs-desktop.png)
- [Czech mobile](../design/images/advisories-table-spacing/cs-mobile.png)
- [Czech mobile actions after scrolling](../design/images/advisories-table-spacing/cs-mobile-actions.png)
- [English desktop](../design/images/advisories-table-spacing/en-desktop.png)
- [English mobile](../design/images/advisories-table-spacing/en-mobile.png)
- [English mobile actions after scrolling](../design/images/advisories-table-spacing/en-mobile-actions.png)

No application strings, endpoints or authorization behavior changed. Existing
build chunk-size warnings remain. GitHub CI is a separate post-push check.
