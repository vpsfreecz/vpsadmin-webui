# Readable requested paths on error pages (2026-11-09)

Approved UX-03/7c773db80dfa673c, UX-04/d5847413b2b70eae; REQ-010.
The finite audit on clean4ef1a2a57f93be0e61640ce6208e58b518f39329 finds
unbroken requested-path text stretching ForbiddenPage and NotFoundPage beyond
the viewport.40fixture cases:8normal paths pass,32long paths fail,64overflow
width states out of80normal/320px observations. Three exact member node aliases,
CS/EN,both themes,desktopChromium/mobileWebKit and public404 are covered.
Forbidden index reaches2017px ondesktop and1761px at320px.

Apply overflow-wrap:anywhere to the two existing monospace path spans. Preserve
the complete pathname/query/hash, labels, typography, recovery destinations,
role gates, auth, API and BFF. No localization change or redesigned error flow.
Add two route-level smoke regressions for long320px requested paths, ensuring
full path text and recovery links remain available. Existing focus tests stay.

Baseline failures and original screenshots are retained, not waived. Prototype,
source checks, focusedCI, clean integration/packaging/paired preview and protected
TODO evidence are separate gates. Broad UX03/04 remainpartial. Fixture errors are
presentation evidence, not live permission/OAuth proof. No physicalSafari/display,
fullWCAG, production/newadmin deployment or PRmerge/approval is claimed.

Evidence:/data/webui-browser-runner/verification-20261103/todo-forbidden-presentation-audit-20261109.

Completed broader baseline56:8normal passes and48long-path failures (including
member/admin404aliases),112width96overflowstates. Current-preserving dirty
prototype56/56PASS,112width56actualkeyboardfocus indicators, plus4overlapping
repo smoke executions pass inChromium/mobileWebKit. Four original baseline/
prototype narrow images opened; fixed path text is wrapped and recovery buttons
remain visible. Pinned quick checks and production build pass. This is prepared
source evidence; cleanNix/currentintegration/exactCI/pairedpreview/TODOpublication
remain required. No consumer closes and no broadcompletion is claimed.
