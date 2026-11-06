# Explain the admin team preference in additional configuration

TODO RES-06, [original forum feedback](https://discourse.vpsfree.cz/t/372/15),
REQ-023. Maintenance already explains the legacy preference and offers both
choices. Additional configuration now uses the same wording and radio group.
A missing value has neither choice selected. Additional configuration keeps
its shared review and sends the existing boolean only when explicitly changed.

The original PHP wording distinguishes base system files from applications
and data and promises email about changes. The shared copy uses terminology
from vpsAdmin revision `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
