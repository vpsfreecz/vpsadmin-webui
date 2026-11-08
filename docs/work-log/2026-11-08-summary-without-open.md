# Summary without redundant Open actions — 2026-11-08

The maintainer requested removing the VPS and DNS Open actions from Summary,
and authorized deploying this and the preceding language/sidebar changes to
newadmin after verification. REQ-009: VPS/DNS entries are compact counts and
labels; their existing sidebar destinations remain. The administrator dataset
action and inline payment-details link retain their existing behavior. The same
component removes both Czech Otevřít and English Open; the shared catalog key
stays in use elsewhere. Counts, ICU plural rules, membership data and permissions
are unchanged. No API, BFF or dependency changes.

Localization procedure and guides read at locked standalone vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. KB impact: the redundant controls
are removed from the dashboard; existing primary sidebar navigation stays.
External KB contract/capture review and deployment evidence are tracked in the
release receipts, without claiming that fixture UI tests update published KB.

Existing Summary/dashboard browser assertions now require the exact count/label
without an Open action in CS/EN and all existing roles/scopes. Verification and
actual deployment receipts are recorded separately after execution.
