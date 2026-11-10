# Readable shared foregrounds — prepared

Approved UX-04/d5847413b2b70eae and REQ-010. A compiled299 gallery rendered
with an isolated window-only developer flag exposes the shared Danger button
label at3.997185:1 in dark mode in Chromium and mobile WebKit. The normal
preview keeps the developer flag disabled; no serving configuration is changed.

Separate the destructive-button foreground from the page background token.
Keep the light foreground white and use black in the two dark theme branches.
Only the danger button variant consumes the new token; all danger backgrounds,
badges, alerts, borders, callbacks, roles and confirmations retain their bytes.
The existing90% hover background remains. In exact sRGB arithmetic even90% red
over pure black has4.632:1 contrast with the new foreground; rendered normal,
hover and focus states still require browser verification. Explicit themes and
system preference require checks because both token paths must agree.

The initial gallery probe's24default-disabled passes and24fixture-config
failures remain retained. The corrected window-only fixture leaves strict BFF
config validation unchanged; two corrected gallery probes reach all four
overlays and both toasts but retain the actual Danger contrast failure.
These are intercepted fixtures, not real API permission or physical display
certification. No screenshots or historical results are relabelled.

Verification is pending. Broad UX-03/04 and nine finite consumers remain partial.
Clean Nix outputs, exact focused sixCI, both previews and protected TODO evidence
are independent delivery gates; no merge or production deployment is implied.

The same finite gallery exposed a second shared foreground gap in light mode:
tertiary text measures4.393:1 on cards and UsageBar values4.080:1 on a zebra
row. Preserve the primary/secondary/tertiary hierarchy and dark token, while
darkening only the two light faint-token branches from100/116/139 to90/106/128.
The expected minimum on existing light surface-2 is4.728:1; actual opaque
leaf-text measurements remain the verification gate. This is a coherent
shared-foreground correction, not a global background or layout redesign.
Original light-gallery failures and exact source revisions remain retained.

Pinned final quick/build passed in both source trees (focused113checked175deferred,
integrated220checked102deferred). The final dirty working artifact passes24/24
first executions,0retry:16destructive control/confirmation configurations with
32width visits/80control-state observations,32actualTabfocuses/16hoverobservations,
32tertiarysamples;8full enabled-gallery configurations/88component-widthstates.
Minimum destructive contrast4.88945, tertiary4.72790;4508opaque gallery leaf
observations,min4.72461. Disabled/excluded text is not a blanket certification.
CS/EN, explicitlight/dark and both system preferences, Chromium/mobileWebKit;
noAPIwrites/pageerrors. These remain dirty working observations, not new clean
committed-package or live-permission evidence. Original failures and CSS4
color-parser diagnostics remain retained. Final clean Nix/exact-head CI/paired
preview/TODO delivery remain pending; current serving release299 excludes this.
