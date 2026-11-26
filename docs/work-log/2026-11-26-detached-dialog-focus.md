# Retire detached dialog focus traps

Requirements: REQ-046, REQ-060.

Original full hosted checks at approved b25 and preview8b had success conclusions, but original logs retained two backup navigation flakes in WebKit and two generated-password focus flakes in mobile Chromium. Neither source was promoted. Digest-verified original trace archives are retained in the external release evidence directory. Native failure evidence showed a focused document, no dialog DOM and no active test-id control. This is not evidence of a background browser.

A portal can disappear before its passive effect unregisters its focus trap. The stack now chooses the highest connected dialog; a detached child cannot intercept result keyboard input or hide its connected parent. Two deterministic tests fail the old stack behavior and cover unconsumed result Tab plus parent wrapping during that cleanup interval. Existing initial focus, nested dialogs, focus choices and Tab wrapping remain covered.

The empty-download navigation scenario now requires the actual loaded Backup Center downloads region before asserting absence and opening detail. Previously the absence assertion could pass on the initial authentication/loading screen and immediately discard its document. All error, write, empty-detail and geometry assertions remain. No retries, sleeps, skips, budgets or assertion removals.

Verification at preparation: new deterministic tests reproduce two failures against the prior stack. Corrected unit/browser/build and exact-head hosted results are release gates and will be recorded with the final PR evidence. No merge, production activation, backend change or builder access.
