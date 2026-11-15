# Readable namespace-map deletion action

Approved UX-04 / REQ-010. Actual admin map-list fixture on clean893ddbba
showed the desktop12px Delete text at3.121:1 in dark mode and5.973:1 in
light mode, weight400/underline. The four targeted probes returned3PASS
and one genuine dark contrast failure; Chromium measures desktop text,
mobileWebKit checks the compact existing list rendering. This is fixture
presentation evidence, not live permissions or a whole admin-consumer audit.

Use semantic foreground/medium weight for the existing table action, retain
its underline and add a separate2px danger marker. Preserve the label,
click handling, confirmation, query/owner/role/API contracts and mobile
compact layout. Only one local class-list change; no global theme redesign.

Prepared for review; not deployed. Pinned source gates, rendered
prototype, exact focused CI, clean current-preserving integration/Nix and
paired acceptance remain required. Broad UX03/04 and all6admin namespace
consumers remain open. No merge/production/newadmin authorization.
