# Signed-in status navigation — 2026-10-16

The maintainer could not find outages or security advisories while signed in and
requested a separate block near the bottom of navigation, above About, with an
administrator entry point for creating outages (REQ-054/055).

## Implementation

- Both links appear in a separated footer block on desktop and in the mobile
  drawer, using existing navigation styling and icons.
- Members and privileged accounts in My view open existing public read-only
  pages. Administrator view opens the existing outage management page with its
  New outage/create/review flow; support retains read-only access.
- Advisory management remains admin-only. Support uses the public list. Removed
  the duplicate advisory entry from the Operations group.
- No API, routes, mutation semantics or publication permissions changed.

Terminology: read both guides from locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, resolved through the builder's Nix
input. Czech combined outage navigation says “Odstávky a výpadky”.

## Verification

Prepared locally, not merged or deployed. Browser evidence uses local application
code and synthetic HaveAPI data, not real outage publication. The footer fixture
covers members, admins in My view, admins and support, CS/EN, desktop Chromium,
mobile Chromium and iPhone WebKit; it opens the admin creation form without
submitting a real outage. See completion results below.

KB impact: inspected the separate KB change workflow and navigation contract.
That contract tracks the legacy PHP vpsAdmin/gettext/landmark source, not this
React repository. No legacy source revision was changed. New-UI sidebar captures
are provided here; external production KB screenshots were not regenerated or
certified by these fixture checks.

## Local results and implemented screenshots

All 24 footer browser scenarios passed with no retries. Type checking, adopted
E2E type coverage, i18n parity, structural budgets, lint/format checks, production
build and documentation audit passed. The navigation unit suite passed 19 cases; the complete unit suite passed 1,837
cases in 298 files using Node 24.21.0 locally.

Synthetic desktop administrator navigation:

![Desktop administrator navigation](screenshots/2026-10-16-status-sidebar/desktop-admin.png)

Synthetic mobile WebKit navigation:

![Mobile administrator navigation](screenshots/2026-10-16-status-sidebar/mobile-admin.png)

[Member navigation](screenshots/2026-10-16-status-sidebar/desktop-member.png) and
[admin outage creation form](screenshots/2026-10-16-status-sidebar/mobile-create-outage.png)
use the same isolated fixtures; no real outage was published.
