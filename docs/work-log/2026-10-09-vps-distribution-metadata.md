# Visible VPS distribution metadata (2026-10-09)

The maintainer overlooked the small distribution badge beside the VPS hostname
and requested the selected distribution near the owner. Move it into the common
metadata row as an explicitly labeled Distribution/Distribuce field, immediately
after the owner in administrator view and before node/location in both views.
The existing os_template label remains authoritative, with the existing missing
value marker; no new API calls or backend changes are needed. Long labels wrap
and the metadata row remains responsive (REQ-014, REQ-010).

Reuses the existing cs/en label. The locked terminology guide and localization
procedure were read from vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. External KB screenshots are not
republished or certified by this frontend change.

The existing four system-summary scenarios now assert the visible localized
label, placement after the owner, empty-label fallback and long-label wrapping.
They are adopted into strict E2E type coverage without changing its immutable
baseline, and enabled for mobile WebKit as well as Chromium.

Prepared separately from the console/search PRs; not merged or deployed.
Verification and synthetic screenshots follow below.

Implemented UI with synthetic fixtures: [desktop](../design/images/vps-distribution/desktop.png)
and [mobile](../design/images/vps-distribution/mobile.png).

## Verification

Pinned Node 24: frontend and strict E2E type checks, the repository's scoped lint,
i18n/structural/design-documentation audits and production build passed. All 28
focused ObjectHeader, VPS runtime header and overview-model unit tests passed.
The production build retains its existing informational chunk-size warning.
An extra direct ESLint invocation on the legacy VpsLayout file reports the
pre-existing missing chainsQ/vpsQ dependencies in its password effect (also
present unchanged on main); this metadata-only change does not alter that effect.
Mac archive sidecar files initially confused the isolated E2E inventory; removing
those transfer artifacts restored the check without changing its baseline.

All 12 system-summary browser scenarios passed: four cs/en admin/member cases
in desktop Chromium, mobile Chromium and mobile WebKit. Screenshots show only
synthetic data; no public site was updated.
