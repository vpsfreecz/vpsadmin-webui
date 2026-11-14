# Scheduled migration acceptance feedback

Direct request MIGRATION-MAINTENANCE-RECEIPT; REQ-028. Locked terminology guide
vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff, resolved from the flake input.

The shared success toast distinguishes immediate acceptance, maintenance-window
completion and a requested custom completion schedule. Classify only the frozen
preparedPayload from mutation variables, never the subsequently edited form.
API maintenance defaults true; explicit custom Sunday0/midnight0 remain custom.
Acceptance does not certify completion. Preparation can precede the window.
Keep the persistent Tasks action and explicitly allow leaving the page.

Only migration's busy-gate presentation changes: pending/unverified work can be
tracked after leaving, while the original gate, durable mutation context, state
tracking, permission checks and uncertain-request safeguards stay intact. Do not
change backend scheduling or clear locks to improve feedback.

Dev baseline4 CS/EN x Chromium/mobileWebKit observations reproduce the old wait
message on actual48cc assets with intercepted API/session/VPS data. This is not a
real migration or completion proof. Working/focused/CI/clean-package/paired checks
are required before delivery; see the durable actual-acceptance-report.md under
/data/webui-browser-runner/verification-20261103/todo-migration-maintenance-receipt-20261114.
No live tenant migration, API activation, production/newadmin or builder access.

Working validation: all48 synthetic browser cases PASS/0retry on three profiles,
CSdark/ENlight. Targeted12units pass, including API-default maintenance and custom
Sunday0/midnight0. Source/type/i18n/strict E2E adoption pass. First browser run
retains6PASS/2negative assertion failures/1interrupted; the scheduled-message
absence assertion now permits an absent toast container. No product assertion or
lock weakened. Exact focused final quick/build/browser, clean Nix, hosted6CI and
paired delivery remain pending. KB workflow scope was reviewed: its current pins
are legacyPHP/API, no React input; no external KB certification or write claimed.

Before publication, an audit found the existing lifecycle receipt regression still
expected the old maintenance title. Update it to the specific scheduled title and
add the new title to rejection absence checks, retaining every original assertion.
Add direct header-link navigation and no blocking progress modal to the new matrix.
Qualify the existing migration subset as well as the new matrix before pushing.

Visual review identified a persistent-receipt wording issue: an unconditional
"not finished yet" claim can become stale after the task completes. Use timeless
acceptance-versus-completion wording and exercise the persistent receipt after a
finished action response. Keep prior CI evidence and qualify the follow-up in the
same draft, without canceling or bypassing original checks.
