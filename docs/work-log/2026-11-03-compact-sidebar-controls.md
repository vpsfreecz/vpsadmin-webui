# Compact sidebar controls

The maintainer asked to separate the signed-in sidebar controls from the menu
and reduce their height. A bordered panel groups search and account controls.
Tasks and the session shortcut share a row when space allows. On touch devices
both controls retain a 44px minimum height. The session shortcut still opens
the same profile setting, and the account menu remains anchored below the row.

REQ-004 and REQ-006 apply. The existing sidebar browser spec covers the row
geometry, navigation and account interactions on desktop and narrow mobile.
