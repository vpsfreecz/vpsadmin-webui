# Account overview copy — 2026-11-07

Original queued request 1, forwarded unchanged from the previous thread, asks to
remove both explanatory time-zone paragraphs and the complete generic Tips card.
The focused change removes those render sites and their Czech/English catalog
entries. The preference row can omit its description without reserving empty
space, as it already does in our integrated preview. REQ-040 records the scope.

The time-zone selection, current/browser values, save and account-change workflow
remain. This is a text removal with no API or permission change. Locked terminology
revision: a65a4dfeb92a59df4a80a737a20bcbf8558793ff. The separate KB contract workflow
was inspected; no KB prose or published pages have been changed or certified.

ci:quick and the working build pass, as do four existing catalog unit cases.
Twelve working browser cases pass: CS/EN, light/dark, desktop Chromium/mobile
WebKit, 320px, retained controls, and the original time-zone save plus rejected
contact-change retry workflows. Synthetic fixtures only. The first capture set
also displayed a missing settings-collection response namespace; this private
fixture is corrected and clean captures are pending. No product change was made
for that setup error. Original captures/logs remain retained.

Read-only KB impact inspection found legacy member.edit-profile navigation
bindings, whose action/label/path do not change here. No managed profile capture
or specific time-zone/Tips copy binding was found. This does not certify all
external wiki pages.
Final packaged evidence, draft CI and paired preview outcomes remain pending.
No merge or production approval.
