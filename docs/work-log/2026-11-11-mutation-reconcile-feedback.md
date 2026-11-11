# Keep reconciliation feedback readable on warning panels

Status: prepared; no merge or deployment is claimed.

The approved UX-04 finite network audit measured 4.353036:1 for the dark
reconciliation failure on its actual warning surface, in Chromium and mobile
WebKit. The ordinary warning body remained readable; its nested danger-colored
feedback did not meet the unchanged 4.5:1 text criterion.

Use the readable foreground for that feedback, with medium weight and a separate
danger border. This is one presentation-only change in the shared uncertainty
panel. Keep both failure messages, reconciliation results, task-opening gate,
lock generations, callbacks and operation count unchanged.

The new strict browser regression exercises an ambiguous owner update, observes
the actual nested feedback foreground/background, checks the visible weight and
border marker, and requires exact-owner reconciliation before release without a
second mutation. It covers Czech/English and light/dark. All API responses and
identities are synthetic; this is not live permission or backend-success proof.

Pinned quick/build, focused and cumulative browser checks, clean Nix outputs,
exact-head CI and paired delivery are still pending. Original negative traces
and practical limits remain in the durable task acceptance report.

## Local verification before the draft commit

Pinned Node24.21.0/npm11.19.0 quick checks, strict E2E inventory, build and final
design/active-documentation checks pass. Existing network model, parity, intent
and local-lock tests pass:30 in each focused source and33 in the cumulative
source. No compiler or deferred-baseline relaxation was used.

The focused regression passes8/8 local configurations in Chromium/mobile WebKit,
Czech/English and light/dark. The combined dirty preview passes16/16 regression
configurations; these are working-build results, not clean Nix or hosted CI.
Clean packaging, exact-head CI and paired publication remain pending.

Working feedback measures at least13.841216:1 across all eight samples, with
weight500 and a2px separate marker. The exact-owner reconciliation clears
without a second intercepted mutation. No live authorization is asserted.
