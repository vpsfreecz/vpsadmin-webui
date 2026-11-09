# Namespace-map add-entry presentation

Approved UX-03/UX-04, REQ-010. On clean preview893, local invalid-ID/count
messages measure3.121:1 in dark mode at12px/400 without a separate marker
in Chromium and mobileWebKit. Actual desktop observations place36px inputs
at y549 and the36px Add action at y569 after validation. Evidence is the
isolated admin namespace audit, using synthetic objects and no live writes.

Use readable foreground, medium weight and a separate danger border for the
three existing local field-error locations. Reserve three label lines in narrow desktop grids and two in wide grids and anchor Add to the input row, independent of error height.
Keep mobile stacking and44px coarse controls, validation text, request bodies,
integer/bounds rules and all save/delete/role/query contracts unchanged.

PR150 directly overlaps this component with137 changed lines, including entry
query-failure guards and summary extraction. Inspected its current patch; this
change only alters add-form classes and does not include, undo or duplicate
that behavior work. Current main88ac and experiment base13a remain unchanged.

Prepared only: pinned ci:quick and build passed on the focused base. The first
quality log is retained; responsive label refinement invalidated its source
snapshot, so the complete final quick/build was repeated with a reviewed hash.
A separate current893-preserving dirty prototype passed8 cases/24 widthstates
and36 contrast measurements in Chromium/mobileWebKit, CSdark/ENlight. Desktop
1440/768/640 and320 probes and mobile390/320 retain36/44px field/control heights.
Input/Add top edges differ0px at every desktop grid width after invalid-ID/count
and bounds errors. Minimum text contrast is11.7465:1; three actual originals
were opened. Baseline8/24 is retained. All operations are isolated fixtures with
zero API writes. This is not a cleanNix, pairedpreview or hardware certification.

A focused draft may start CI. Current-preserving cleanintegration, exact6green
checks and verified pairedrelease are required before preview activation. The
admin mapdetail consumer and both broad tasks remainOPEN; row/APIerror text
and separately owned PR150 behavior are not closed by this add-form-only work.
