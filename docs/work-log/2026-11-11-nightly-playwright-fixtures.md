# Restore the nightly Playwright fixtures

The November 10 scheduled Chromium run on main revision `88ac13b8` reported
47 failures. The mobile Chromium job passed.
[GitHub Actions run 42805710565](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/42805710565)

Update the affected fixtures to match the generated HaveAPI client and the
existing UI. Return the declared resource keys for dataset, search and node
responses, and include the expected success payload for updates and deletions.
Provide both nullable lifecycle dates when exercising a state change. Return
the current scoped IP allocation for the fallback from assignment history.
The tests still check API parameters, rejected operations, retries, links and
navigation. The affected deferred specs now participate in strict TypeScript
checking.

The browser checks exercise mock requests and synthetic objects. This change
updates browser tests and their type inventory.

All 47 previously failing Chromium cases passed locally in CI mode without
retries. The script and BFF suites passed 244 and 58 tests. The unit suite
passed 2,357 tests with six workers after a loading-state timeout in the
initial parallel run. The production build and strict E2E type check passed.
