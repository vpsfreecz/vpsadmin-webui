# Align public mobile preferences

The maintainer requested the same theme icons beside the language choices on mobile and desktop. The public menu uses shared language controls and keeps both groups on one row at 320 px, with wrapping if the available width is smaller.

REQ-009. Browser checks use isolated public API fixtures.


The hosted mobile Chromium run exposed a row wrap at 320 px. Tighten the
mobile-only spacing around the groups and keep each control at least 44 × 44
CSS pixels. The 320 px smoke case checks alignment and touch target dimensions.
[Original run](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41843329534).
