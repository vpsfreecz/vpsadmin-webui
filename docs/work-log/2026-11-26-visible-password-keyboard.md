# Start password keyboard checks from a visible control

Requirements: REQ-010, REQ-023, REQ-060.

Approvedf2fb and preview6759 each passed100original three-engine checks locally, but the original completed mobile-Chrome shard3 log for approvedf2fb retained one flaky initial-focus assertion in the Czech/light generated-password case. The two connected-trap regression tests still establish a real, independently fixed defect; they do not prove that this intermittent browser symptom is resolved. Neither paired stage was activated. Original logs and a47MB first-attempt archive, verified against the GitHub SHA256 digest, are retained externally.

The failed trace shows a focused document and no dialogs. An earlier retained failed trace records document scrollTop1414 immediately after programmatic focus. This supports investigating the overlap between mobile viewport changes, an off-screen target and native scrolling; it does not establish a browser-engine root cause. Separate2xrenderer-CPU diagnostics passed12old and12new cases without reproducing the symptom and are not causal proof.

The existing generated-password scenario now scrolls its target into view, waits for native element stability and asserts it is in the viewport before initial focus. Every original geometry, masking, mutation, initial focus, Tab-to-Copy, Shift+Tab and focus-visible assertion remains. No sleeps, forced page activation, retries, timeouts, skips or budgets changed. A bounded native focus/resize journal and active element tag/scroll/viewport evidence are attached on failure to make another failure actionable. The observer never changes focus or browser online state.

Only E2E setup/evidence and documentation change relative to the fully physically tested baselinesf2fb/6759; product, unit, dependency and configuration inputs remain unchanged. Exact quick/build/relevant checks, source-equivalence evidence, original browser cases and all final exact-head hosted checks/logs remain gates. No merge, API/production activation or builder access.
