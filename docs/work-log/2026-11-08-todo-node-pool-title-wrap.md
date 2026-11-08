# Wrap long node pool labels

Approved UX-03 / REQ-010 includes checking headers with long Czech text.
The infrastructure audit on clean preview `c4697e44` found that the pool
heading uses `truncate` without another full-name presentation. Its ID remains
visible. With the same synthetic long label, the title measured 443px of text
inside 432px on desktop and 220px at a 320px viewport.

Prepare a local change to wrap the complete label inside the existing heading
group. Keep the ID, state badge, checked time, maintenance gates and API behavior.
No new UI copy or translations are involved.

Status: uncommitted local preparation on `dev/node-pool-title-wrap`, based on
`kerrycek-021126` at `13a39a58`. The component is byte-identical in that base and
the audited preview. A fresh upstream fetch and all 77 open experiment PR file
inventories found no overlapping NodeStorageCard change.

Baseline evidence is an intercepted fixture, not live authorization proof.
The local change has not been built, browser-tested, committed, published as a
PR or deployed. Next verify normal and unbroken labels in CS/EN, light/dark,
desktop Chromium and mobile WebKit at normal/320px, including badge and checked
time containment. Complete relevant source checks/hooks, focused draft PR,
exact-head six CI checks and clean Nix provenance before paired preview release.

Local verification update: pinned Nix source quick checks and working frontend
build passed on both branches. The baseline browser cohort passed 16 cases
(CS/EN, light/dark, admin/support, Chromium/mobile WebKit, normal and 320px)
and reproduces clipping with synthetic data. Corrected follow-up retains the
original failed test setup evidence: missing test-info argument, then scalar
pool.node rejected by the current preview SDK. The new regression uses the
actual node-object contract and local test preferences; strict zero-write
checks remain enabled. Working and clean-package browser results, exact CI and
paired deployment are still pending and will be recorded separately.
