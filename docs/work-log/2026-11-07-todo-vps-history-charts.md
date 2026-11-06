# VPS history charts

RES-07/08 follow REQ-017 and [Discourse #19](https://discourse.vpsfree.cz/t/372/19).
The history action sits beside its description and requests data on demand.
Reopening fresh history reuses its query result. The loading, error, empty
and refresh states remain visible.

Expanded VPS charts have visible value and time axes. Timestamped missing
values leave a gap, and individual isolated measurements remain visible.
The chart supports touch and keyboard point inspection in the account's time
zone. Other uses of the shared chart retain their compact layout.
Terminology revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
