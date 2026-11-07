# Mount dataset selection

Approved STO-03, review b64da9d8d274f384, no attached condition. Replace the
exact-name input with a locally paged candidate list and explicit confirmation.
Only active current-owner subdatasets of the VPS root are candidates; query
hypervisor role and owner for actual admins, including their My view. Members
rely on backend ownership. Preserve review, mutation gates, busy locks and action
tracking. Selection defaults local mounts to bind. Remote NAS mounts inside
vpsAdminOS use NFS from inside the VPS instead of this transaction.

Use a bounded snapshot, not the Dataset#index full_name/ID cursor mismatch in
HaveAPI 0.32.2. An incomplete response offers separately confirmed exact-name
lookup with owner/root validation. No API, BFF or dependency changes. Search,
context and lookup failure cannot leave an old selected dataset behind.

Terminology locked vpsadminServices a65a4dfeb92a59df4a80a737a20bcbf8558793ff;
both guides read. Actual dev API 22adc8b5 mount-chain and index source inspected;
this is not a real authenticated mutation/authorization audit. External KB
workflow unavailable. Browser tests use synthetic fixtures, including scope,
nonmonotonic IDs, empty/error/capped results, stale replies and explicit payload.
Deployment and check outcomes will be recorded after execution.
