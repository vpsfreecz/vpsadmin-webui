# Consistent public navigation targets (2026-11-09)

Approved UX-03/7c773db80dfa673c, REQ-010. The new isolated public-shell audit
on actual clean e15bb1d14106dd253386e5cfe28fc298ae80f5f0 measures36px menu
and navigation rows and38px sign-in beside44px locale/theme controls at320px
in mobile WebKit. Branding is24px high. Desktop language choices lack the
32px minimum used by theme buttons. These are rendered fixture/source results.

Change six class lists only: apply shared any-pointer:coarse minimums to
branding, navigation, the menu toggle and sign-in/back actions; match desktop
language choices to existing theme minima. Preserve labels, active/aria states,
destinations, return paths, roles, menu state, authentication, API and BFF.
No localization change. The focused13a base has older language markup than
actuale15; preserve each source context rather than replacing the component.

Baseline32 distinct role/language/theme/engine cases:24initial passes plus
8corrected anonymous passes. The original8failures assumed a relative href
where the special fixture deliberately supplies an absolute same-origin login
URL. Corrected checks require exact origin/path/next; all originals remain.
That is40executions for32configurations. Additional overview40cases pass:
zero/empty, independent stats/nodes/news failures, held loading, expired-session
return and unavailable counts. No live API writes, identities or objects.

Evidence:/data/webui-browser-runner/verification-20261103/todo-public-shell-overview-finite-audit-20261109.
Prototype/source checks, exactCI, clean packaging and actual release are separate
gates. BroadUX03/04 remainPARTIAL38. No consumer closes from this prepared fix.
Fixture role is not live permission/OAuth proof; no physicalSafari/display or
fullWCAG claim. No production deployment, PR merge or approval.

Current-e15-preserving dirty prototype32PASS: coarse targets min44px; two
CS/EN desktop probes measure locale/theme group offset8px before and0px
after (32px buttons). Existing PublicLayout9unit tests pass; pinned
ci:quick/source checks and production build pass. Two actual prototype
mobile/narrow originals opened; cleanNix/currentintegration/deployment and
exactCI remain pending. No actual release or completion is claimed.

## Extended navigation acceptance and required dependency

The finite current4ef wrapper audit passes24geometry/focus scenarios for
AdminClusterLayout, AdminNetworkingLayout and AdminContentLayout, CS/EN/both
themes/Chromium/mobileWebKit. It confirms36px shared TabsNav links at320px on
coarse pointers. Add the same44px coarse minimum to the one shared tab class;
keep wrapping, routes, labels, active aria/ring meaning and all children intact.
No redesign or selection of the separate navigation models is made.

The first245head6bb CI is green but its downloadedChromium log reports646passed
and1flakyOOMhistory/pagination test. Do not deploy or waive that result. Include
existing PR243/4df369be (already in the running preview) in this focused baseline.
Original head/logs andfailedattempt are retained. New exact-head CI and zero-flaky
logs remain required, as do clean packaging and paired runtime guards.

Adopt the changed shared TabsNav source into the existing scoped lint/format
coverage. Remove only its deferred source hash; preserve every other entry and
the reviewed revision. No frozen baseline or quality gate is relaxed.

Current-preserving wrapper prototype24/24PASS,48normal/320width states,
128actual tab focus samples plus24bodyfocus; coarse targets36to44px. Sixactual
narrow originals opened. Child fixtures show read-error/missingnamespace states;
only headers/tabs are accepted by this slice, no claim of childworkflow success.
Eight exact knownOOM scenario executions onclean4ef pass (4perengine,6xCPU
throttlingChromium), plus18existinghook/UI/semantics unitregressions. Pinned
quick checks/build and finaldesignaudit pass. Exactupdated245CI and paired
clean release remainpending; do not activate old4ef staging from flaky6bbhead.
