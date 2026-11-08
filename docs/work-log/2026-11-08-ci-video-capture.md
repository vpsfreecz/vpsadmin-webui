# CI video capture overhead

The previous integrated candidate completed 18 public checks successfully, but
two duplicate-project smoke jobs reached their existing 40-minute job budget.
Captured logs show progress and cancellation without a failed assertion report;
that is incomplete verification, not an all-green suite. Counterpart jobs at the
same source succeeded. Video retain-on-failure still continuously records each
passing test before pruning the file; active FFmpeg encoders were present when
the cancelled jobs were terminated.

A controlled local comparison used the same clean 49b6aa3b frontend, 12 sidebar
scenarios, Chromium/mobile WebKit and two workers. Both phases retained failure
traces/screenshots and passed 12/12. Excluding lease wait, recording every passing
test took 129.15 seconds; recording only on the first retry took 111.58 seconds,
a 13.6 percent reduction. This is evidence of avoidable capture cost, not a
promise that the entire remote suite will fit its budget. Fresh full CI remains
a required gate.

Use on-first-retry video in CI while preserving trace/screenshot retention for
the first failure and video on the first retry. Keep local recording behavior,
all test selection, assertions, per-test/job timeouts, worker count, retry count
and artifact upload/retention unchanged. No sharding, skipped tests, new browser
capacity, runtime/dependency or product behavior changes. This is an independent
main-based verification change; no production or shared-main merge authorization.

The private expected-failure diagnostic probe verifies actual first-attempt
trace/screenshot and retry-video files on the pinned runner. It is not a product
acceptance test and its deliberate failures must not be counted as passing
application scenarios. The expected-failure probe completed: two deliberately failing scenarios and
four attempts across both engines. Every initial failure retained trace.zip and
an automatic failure PNG, with no initial WebM; each first retry added WebM while
retaining its trace/PNG. The verifier passed those artifact checks. Application
scenarios remain separate: both comparison phases passed 12/12.

Pinned source ci:quick passes (153 adopted E2E leaves /130 deferred, normal
lint32, design180/76, root/tooling/E2E/BFF types and BFF contract6). Fresh public
CI remains required; no full-suite performance guarantee is claimed.
