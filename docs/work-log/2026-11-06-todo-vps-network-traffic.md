# VPS network actions and monthly traffic

TODO NET-04 and NET-05 follow [Discourse #19](https://discourse.vpsfree.cz/t/372/19)
and REQ-050. Move the network status badge next to the summary title and
keep the refresh action in a separate right-hand slot. Existing network
operation availability and explanations use the same mutation gates.

Show the current month's incoming and outgoing traffic together. A missing
direction, an empty response and a failed request do not display a measured
zero. The explicit month-to-date period applies to both directions.
Terminology follows vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Browser evidence uses
synthetic data and does not certify the live accounting API.
