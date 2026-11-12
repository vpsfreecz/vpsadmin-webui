# Backup navigation prerequisites for original CI — 2026-11-12

BAK-04, existing draft PR278; preserve the original reviewed backup behavior.
Original attempt-one Chromium CI had one flaky navigation/history contract.
Keep that result rejected rather than using a retry as release qualification.

The original OOM trace restores stale URL filters during Next; exact native
regressions fail2/pass4 before reviewed PR243 and pass6 after it. The original
incident trace drops seven filters during Next; current preview2443 reproduces
it under CPU6, and two deterministic rendered-page regressions fail before
the caller correction. PR307 supplies the incident caller snapshot and includes
unchanged reviewed PR243. Include those bounded prerequisites in this focused
branch, preserving all original backup source, locale and feature-test bytes.
The already reviewed immutable browser-image prerequisite retains all six CI
checks, browser projects and assertions. No API/SDK/dependency changes.

Working merge verification: 32 native tests, pinned ci:quick and production
build pass with a matching lockfile/dependency tree. Its hook/OOM/incident
runtime bytes equal clean PR30778e0e973. That exact dependency has native40
and clean20 CSdark/ENlight Chromium/LinuxWebKit scene/role cases passing, with
zero retries/errors/API writes and explicit existing saved preference fixtures.
This does not replace this branch's required new exact-head original six CI
checks or the backup feature's clean-package browser/paired release evidence.

No PR approval/merge, task completion, preview activation or production/API
deployment is claimed. Original foreground checkout and original flaky logs
are retained. Local evidence: /data/webui-browser-runner/verification-20261103/
todo-incident-navigation-20261112/.
