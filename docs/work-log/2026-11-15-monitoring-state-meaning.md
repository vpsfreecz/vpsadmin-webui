# Monitoring state deadlines and decision meaning

Approved MON-01 b23bcdccd143faf2 / MON-02 df8847274f273fd7, REQ-051.
Extend existing own draft PR226 while retaining its already verified monitoring
and incident validation contrast fixes. The two bounded approvals cover truthful
CS/EN field, action and dialog meaning, without backend or permission changes.

Actual dev source5cbac97dbbb79b2e1a77be81dc91328249d96f16 reproduced the issue
in8fixture contexts: member/admin, CSdark/ENlight, Chromium1440/mobileWebKit320.
All8passed without retries/failures/flaky/skips/live writes. Six scenes each,
48unedited originals retained;16selected originals individually viewed.
The frozen capture program is f4bf5869baf4485b807a0c7bdd55565b31c9cbc538099f3d535a5badc3f02551.
Saved until suggests record retention; the acknowledgement dialog incorrectly
calls muting optional, and ignored/no-deadline values promise Until closed.
API/session data are intercepted, not live permission or backend timing evidence.

Source contract: actual API22adc8b54d464e0f899550746b69181930da80fd,
PID1787468/cwdpayment-payer-account repo/api,21tracked file hashes match HEAD.
MonitoredEvent#ack! and #ignore! store the chosen state and optional saved_until.
On the next report after a deadline, the state resets to confirmed before the
result is handled. Acknowledged events keep logs and close on a passed check;
ignored events skip result logging and passed-result closure while ignored.
Both suppress repeated ongoing-problem alerts. Checking itself is not disabled.
Nonadmins retain owner/visible-state restrictions; access_level, object lifetime
checks and the permitted confirmed/acknowledged/ignored action states remain.

The list/detail name is State deadline / Platnost stavu do, with nearby text
explaining re-evaluation on the next check. Explicit null acknowledgement/ignore
deadlines show No time limit; missing values show Unknown. Other empty values
retain the unavailable marker. Both views share the small value presenter.
System confirmation and user acknowledgement have distinct labels. Dialogs
explain their actual effects; duration choices have a native associated label,
and custom date fields have an accessible name. A finite preview explains the
next-check boundary. An unlimited preview states only the lack of a time limit.
Invalid custom dates show their validation error without an unlimited preview.

No API adapter, untilIso/presets/default, query/cursor/scope/polling, mutation
callback/payload, pending/duplicate gate or error/retry behavior changes.
Existing contrast markers and validation remain. New source browser scenarios
cover list/detail date/null/missing cases, CS/EN member/admin copy, narrow layout,
finite/unlimited exact intercepted payloads and pending duplicate protection.
They are fully adopted into strict E2E typing; WebKit also runs the unchanged
existing action-feedback/validation spec. No baseline/budget or CI weakening.

Terminology: locked vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff,
both guides and the separate KB workflow read. The inspected KB contract pins
legacy API/PHP inputs and has no React feature input; do not substitute an
unrelated API revision for this WebUI commit. External KB pages/screenshots,
physical Safari/displays, native OS and live permission/backend behavior remain
uncertified. No live objects/accounts are created; no object cleanup is needed.

Status: working implementation; full focused/cumulative checks, browser acceptance,
exact committed builds/Nix/CI, paired delivery and protected result publication
remain separate gates. Main88ac13b89d6421c914cd57e18153de1fee6fc7b7 and base13a39a58
were read fresh; colleague PR115/150 and held DNS116/117 are excluded. No merge,
API activation, production/newadmin deployment, builder access or scheduler change.
Evidence: /data/webui-browser-runner/verification-20261103/todo-monitoring-state-meaning-20261115.

Working qualification before commit: both fullquick/relevant units/build passed
(21focused/51cumulative units); focused36and cumulative60browser cases passed
across Chromium/mobileChrome/LinuxmobileWebKit,0retry/fail/flaky/skip/writes.
Cohorts overlap; not unique-behavior totals. Four narrow working modal originals
were individually viewed; they are not deployed or desktop comparison evidence.
The original exact implicit-label locator failure and harness selection/helper
setup failures are retained. Exact accessible role/name assertions and all
payload/pending checks remain; no timeout/retry/budget weakening. Final strict
E2E types also passed after that correction. Exact committed quick/build/Nix/CI
and paired/protected delivery remain separate gates.
