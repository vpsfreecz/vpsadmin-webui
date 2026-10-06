# Preserve pagination intent while the router is pending

Prepared, not merged or deployed. Requirement: REQ-046.

The CI audit found first-attempt Previous failures in VPS and DNS lists. The VPS
trace showed an enabled Previous button become disabled immediately after the
click, followed by a return to page 2 without a page-1 request. This distinguishes
the symptom from a click simply missing the button.

The shared hook updates its local cursor synchronously while router navigation
can remain pending. A quick return to page 1 was discarded as a URL no-op because
the router params still described page 1. The pending page-2 transition could
then overwrite the local return. Always send explicit page navigation; retain
URL equality suppression only for automatic normalization. No API changes.

Four deterministic hook regressions model delayed router publication, Previous
and numbered-page navigation, forward history, Back/Forward, retained filters
and no-op normalization. Two regressions fail on main before the fix. Fixture
browser repetitions and complete CI results will be recorded in the PR. These
checks do not certify a live API or every intermittent browser failure.
