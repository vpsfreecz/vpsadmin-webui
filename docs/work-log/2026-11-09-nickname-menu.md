The maintainer asked to consolidate the authenticated sidebar account controls
under the nickname (REQ-004, REQ-009 and REQ-012). The existing bounded popover
now contains appearance, language, Account and logout. The sidebar and drawer
share the same control. Administrators with scope access also see the existing
scope switch and a compact, passive Mine or All badge beside the nickname.
The nickname can truncate while the badge and arrow keep their width. The full
nickname and role remain available to assistive technology.

This change builds on the contextual help modal in PR230, which removed
the help placement preference. The route-based scope switch, support route
access, theme and language persistence, personal profile routing and native
logout URL use their existing mechanisms.

Terminology uses the pinned vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The KB capture contract maps the
legacy PHP application, with no matching React nickname menu capture.

Verification covers role visibility, both scope directions, long logins at
narrow widths, dismissal and focus, account routing and the configured logout
destination with a synthetic session. Preview evidence is recorded separately.
