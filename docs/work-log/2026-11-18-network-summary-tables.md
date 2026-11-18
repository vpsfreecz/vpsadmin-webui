# Compact monthly and live network summaries — 2026-11-18

NET-13 / REQ-050. Under the delegated design choices,use semantic summary
tables instead of repeated statistic cards. Monthly traffic identifies its
period and ingress/egress/total byte volumes. Live traffic has ingress/egress
columns and distinct byte-rate and packet-rate rows,retaining sample time.
Keep detailed per-VPS tables,charts,interface selection,scope and queries.

Only summary display marks missing counters or absent current-month data as
unavailable; measured numeric zero remains zero. Live summary rates require
finite counters and a positive measured interval. Existing chart aggregation
and missing historical sample interpolation are unchanged and are not newly
certified by this summary change. Empty collections and failed reads retain
the existing distinct surfaces and refresh behavior.

Locked terminology a65a4dfeb92a59df4a80a737a20bcbf8558793ff; both guides read.
No API/SDK or production configuration changes. Focused checks,browser states,
required CI and paired deployment are pending separately. Browser API/session
are isolated fixtures,not production measurements or permission proof.
