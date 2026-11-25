# Incident pending-filter navigation — 2026-11-12

REQ-046 / REQ-051; release blocker for approved BAK-08. Original PR277
attempt-one Chromium trace shows Next dropping all active URL filters while
requests still contain the applied values. Current clean preview24437184 also
reproduces this under CPU6:1 failure in6 executions with no retries. These
are intercepted fixture observations, not live permission certification.

The shared hook already supports an optional applied navigation snapshot in
reviewed PR243. Incidents did not supply it. Reuse its existing role-aware
serialization for both the filter URL writer and explicit pagination; do not
change automatic normalization or browser-history input. Keep unrelated query
values, API fields, authorization scope and visited cursor behavior. No locale,
BFF, SDK, dependency or backend changes.

A deterministic rendered-page regression deliberately holds router publication
after applying all seven administrator filters. Next and page-size change both
lose vps7 before the correction (2 failures), and both retain all seven filters,
unrelated params and exact cursor/size after it. The existing browser scenario
now checks each of the seven Next URL filters in addition to its original API,
normalization, unsupported-input, history, role and owner assertions.

Focused source includes unchanged reviewed PR243 as a prerequisite. The cumulative
preview already contains it. Focused CI also retains the previously reviewed
immutable browser image used by current preview CI. Original277/278 flaky
receipts remain rejected; neither backup task is marked complete by this patch.

Working cumulative verification: native41 PASS, pinned ci:quick and production
build PASS. Remote fixture evidence:12 CPU6 Chromium repetitions of one admin
scenario, then20 distinct scene/role/browser configurations (CSdark/ENlight,
Chromium desktop/Linux WebKit mobile, member/admin/support/adminMy/supportMy),
all PASS with zero retries. The20 scene journals assert zero pageerrors and
zero API writes; HTML language/theme are asserted. Do not count32 executions
as32 unique configurations. The slowed public scenario has no pageerror counter.

Initial focused native/quick/build used borrowed cumulative dependencies with
a different lockfile; they are retained as observations and do not qualify the
focused source. Independent correct-lock npm ci, native40, pinned ci:quick and build now pass.
Clean committed packages, hosted CI, preview/protected delivery remain pending.
No physical Safari/live permission claim or live objects. Durable local evidence:
/data/webui-browser-runner/verification-20261103/todo-incident-navigation-20261112/.
