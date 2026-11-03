# Scroll outages and advisories with the menu

The fixed status links consumed sidebar height even when the rest of the
navigation was scrolled out of view. Outages and Security advisories now follow
the last primary navigation item in the shared scrolling area. On mobile they
also belong to the same drawer navigation. Role and view still determine
whether these links open public information or management.

REQ-054 covers the placement and route behavior. The existing sidebar tests
check the menu order, desktop scrolling, drawer navigation and role-specific
destinations with synthetic API fixtures.
