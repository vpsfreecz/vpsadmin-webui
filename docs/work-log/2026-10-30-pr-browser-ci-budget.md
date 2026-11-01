# PR browser CI completion budget — 30 October 2026

Prepared as a focused follow-up to the authorized network/DNS dev preview.
No application, backend, production or test-selection change.

[Preview run 41128629733](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41128629733)
completed all 642 desktop checks successfully in 29.5 minutes, then the job was
cancelled at its 30-minute overall limit. Setup consumed the remaining headroom;
the log records `642 passed` immediately before `The operation was canceled`.
The same source passed 584 mobile Chrome and 284 mobile WebKit checks, with two
existing WebKit skips. This cancelled desktop job is not reported as green.

Increase only the PR smoke job's overall timeout from 30 to 40 minutes. Keep the
matrix, two workers, scripts, fixtures, retries, assertions and retained reports
unchanged. The bound covers installation, complete tests and final reporting;
it does not change the 90-second per-test bound or hide a failed assertion.
Broad/nightly job budgets remain unchanged. Original feature PR113/114/116 each
already passed their six exact-head GitHub checks; this is the larger combined
preview's completion issue, not a failing application check.

Validate the existing Playwright workflow/CLI contracts and design documentation
with the pinned development-machine runner. A subsequent GitHub run must retain
the original cancelled attempt and report its own actual outcome separately.

The GitHub check annotation confirms: `The job has exceeded the maximum
execution time of 30m0s`. On pinned Node 24.21.0 on the development machine,
all 11 existing Playwright workflow/CLI/harness contract checks and design/active
documentation audits passed. No browser assertion or application source changed.
