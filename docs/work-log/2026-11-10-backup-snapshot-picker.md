# Simplify the snapshot dataset selection prompt

Approved BAK-04/e7773fac6bc24a88, REQ-009/010. Remove the redundant
introductory card from the Snapshots tab. The empty workspace tells the
user to select a dataset in Storage. The selected dataset, original
snapshot actions, detail link, invalid-selection state and guided restore
remain available. The Plans tab retains its own introduction.

The locked vpsAdmin terminology input is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. KB contract snapshot
`f97785c2c265172a4c78893e0673034fde56e4dd` targets legacy backup pages.

Pinned quick checks, production build and 16 backup center unit cases pass
per variant. The final four-case bilingual Playwright cohort per variant
covers desktop and 320px WebKit, including the original NAS detail link.
The original private test expected a VPS path for NAS and its logs are
retained. The product route was already correct.
