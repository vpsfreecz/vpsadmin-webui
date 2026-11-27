# Retire API reads when the document leaves

Requirements: REQ-010, REQ-046, REQ-060.

The original approved890 mobile-WebKit shard3 log contains one flaky read-only support all-actions case: a help_boxes GET starts while the old document leaves and WebKit reports an access-control error. The test already waits for the page heading and network idle before navigation. All reported jobs finished successfully, but that first-attempt failure still blocks qualification; its original logs, trace and artifact are retained externally. Neither prepared preview was activated.

Port the existing cumulative preview document-read lifetime implementation into the focused SDK integration candidate. Bind only GET and OPTIONS to document retirement on beforeunload/pagehide, release event listeners when requests settle, and allow reads again after pageshow or trusted foreground activation following a cancelled departure. Keep caller cancellation independent because the same caller signal may also belong to an already-submitted mutation. Preserve generated SDK transport, namespace, authentication and error contracts. This is a bounded integration repair, not inclusion of the other pending preview features.

The four lifecycle regression cases fail against the original client (19 pass,4 fail), then pass with the bounded repair (23 pass). They exercise both departure events, active reads, shared caller signals, submitted mutations, blocked late reads, synthetic activation and pageshow recovery. Existing browser assertions, retries, timeouts, skips and budgets are unchanged. Full exact-source quick/scripts/BFF/unit/build, original three-engine navigation cases, reproducible local Nix artifacts and final hosted checks/logs remain qualification gates.

Source implementation originates in cumulative preview commit e2eb493b (Michal Janoušek); SDK client integration remains based on Aither main e311b1c0. No main merge, production/API activation or prohibited builder access. Prepared; final qualification and paired preview promotion pending.
