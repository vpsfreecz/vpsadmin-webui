# VPS storage summary and root dataset actions

STO-01/02/04/05/06 follow REQ-048 and
[Discourse #19](https://discourse.vpsfree.cz/t/372/19). The capacity row
compares used space with the effective quota. The manual mount summary
distinguishes empty, loading, and failed reads. Access labels represent
the API's explicit ro and rw modes, with unknown modes reported separately.
The current state is independent of configuration. Skipped, delayed and
waiting mounts are called out for inspection without treating unmounted
as a failed operation.

The root dataset ID links to its detail. Subdataset creation is the
existing capability-gated action with the current parent preselected.
Snapshot and export actions remain available in the header. Short
technical fields are visible inline and the longer system explanation
remains collapsible for administrators. No API or permission change.
Terminology follows vpsAdmin revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
