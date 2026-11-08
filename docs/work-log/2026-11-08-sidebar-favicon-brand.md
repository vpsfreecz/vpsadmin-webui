# Sidebar favicon branding

The maintainer requested replacing the orange VA placeholder at the bottom of the
navigation with the original vpsAdmin favicon. Reuse `/favicon.png`, the same
existing48×46 PNG referenced by index.html, without changing the asset or applying
filters. Keep a32px square layout box with object-contain to preserve its aspect
ratio. The shared AppLogo renders this in the desktop sidebar and mobile drawer.
Retain the adjacent visible vpsAdmin name, footer placement and navigation behavior.
The image is decorative (empty alt and aria-hidden) to avoid repeating the product
name for assistive technology. REQ-004 and REQ-010.

No UI wording, localization, SDK, API, dependencies or BFF changes. No AI image
creation or replacement logo. Existing KB page text/routes remain unaffected;
new React screenshots do not certify historical KB screenshots.

Prepared in an isolated branch from verified983d062b; focused draft targets the
stable own-nodes branch so its diff excludes earlier received tasks. Actual source
checks, clean package/browser verification and screenshots are pending. Final
paired preview and live verification remain separate from preparation; no
production switch or shared-main merge is authorized.

Pinned npm ci and ci:quick pass (198 adopted E2E leaves /110 deferred), normal
lint40, reviewed formatting77, catalogs, mutation audit, root/tooling/E2E/BFF
types and BFF contract6. No compiler baseline or test budget change. Browser
verification reuses the existing12-case sidebar-controls suite across Chromium
and mobile WebKit, with private screenshot/decode probes for the unchanged
favicon. Baseline and exact new-package results remain pending at source commit.
