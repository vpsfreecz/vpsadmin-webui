# Host-IP filter wrapping and alignment

Approved UX03 `7c773db80dfa673c`, REQ-010. The exact8c table-scroll audit
revealed a separate filter-layout gap on actual rendered1280px Chromium: three
left fields wrap into two rows while the select/clear group is centered between
them. At320,256px lookup wrappers are narrower than the288px address field.

Use the existing flat FilterBar children and responsive widths. Preserve44px
fields/actions, original labels, lookup inputs, role/query/API contracts and
callbacks. The focused13a source also gains the44px selectors/clear class
already present in the actual8c integration; no backend or functional behavior
change. No shared FilterBar change or effect on unrelated consumers.

Evidence: /data/webui-browser-runner/verification-20261103/
todo-host-ip-filter-alignment-20261110. Parent8c native table-scroll8cases/16widths/
48actual focuses remains distinct fixture evidence. New alignment/query tests,
quick/build, exact focusedCI and clean candidate/paired/TODO delivery pending.
Broad UX03/04 and Host-IP remain open. The separate PTR error-behind-modal
functional finding and compound IP-chip removal are unchanged and unclosed.
No live operations, merge, production/newadmin or user-decision changes.

Pinned ci:quick/build passed for focused112/175 and integrated219/102.
Unchanged bounded browser regression on actual clean8c has8 intended failures
for half-row alignment/mobile widths; same8 pass on working integration.
Each observes native/320/768 with five44px controls, available input focus,
unchanged address/assignment/clear query+API behavior and zero synchronous
request-observed writes. These are intercepted fixtures. No exact clean-package
or current new-head CI/paired/TODO delivery claim yet.
