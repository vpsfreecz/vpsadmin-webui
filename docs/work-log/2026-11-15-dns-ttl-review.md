# Show known inherited DNS record TTL

Approved DNS-10 / REQ-049, review version 63bb3d86675718b9.

Distinguish explicit record TTL, null inheritance from the current validated zone default, and missing/invalid unknown values. Show the known default in blank-field help without filling the draft. Preserve omitted TTL on Create and null on Update when clearing an override; no query, mutation, validation or lock changes.

Baseline: actual deployed FE3 assets with synthetic isolated API/session fixtures,
CS dark/EN light, member/admin, Chromium1920/2560/1024 and Linux mobile
WebKit390/320. No live DNS objects or writes. Long TXT forced a2321–2332px
table and moved actions out of view; mobile names were ellipsized. Null TTL
displayed as unavailable and the editor offered3600 despite zone default7200.
The DNSSEC sentence repeated copying rather than explaining record purpose.

Focused regression: `dns_inherited_ttl.spec.ts`; existing CRUD/busy gates, feedback,
key wrapping and secondary management are verified separately where present.
Fixture roles are not live API permission, DNS propagation or physical Safari
proof. Locked terminology source a65a4dfeb92a59df4a80a737a20bcbf8558793ff
and both guides read. The KB inputs currently bind API/legacy PHP, not React;
no unrelated KB pin or external screenshot certification is claimed.

Prepared only: native checks, clean Nix/browser, exact-head CI and paired
preview/protected TODO delivery remain pending. No merge or API activation.

Before the responsive-test correction, cumulative working source passed full
quick checks,81 DNS units and frontend build. The unchanged product artifact
passed36 new browser cases and161 corrected existing DNS regressions across
Chromium, mobile Chrome and Linux mobile WebKit with two workers, no retry,
failure, flaky or skipped cases in the qualifying runs. All full query and
mutation calls including callbacks match each exact parent; payload models,
adapters and pins are unchanged.

The original existing attempt159PASS/1FAIL and clean-FE3 baseline failure
are preserved: the old CRUD test targeted hidden desktop rows on mobile.
Its viewport-aware card/row selectors preserve all assertions and add
mobile WebKit plus PR tags. Each source retains its original fixture wire
shape; no timeout, retry or budget was relaxed.
The first responsive full run117PASS/2FAIL/1INT/41notRun exposed a test
measurement on about:blank before app meta viewport. Measure after the
record-list load instead; targeted corrected CRUD3 passes before the full
161v2 qualification. Both failed attempts remain evidence.

These results qualify the working cumulative artifact only; each committed
focused source still needs its own full quick/build, relevant tests, clean
Nix/browser and original six hosted checks before publication or deployment.
No live DNS permission, propagation or physical Safari claim.

Focused exact quick correctly rejected the modified CRUD source while it was
still deferred on the old foundation. Adopt the complete file in the strict
registry and explicit files list; replace any with checked unknown payloads
and explicit fixture types. Preserve original flat/wrapped wire shapes and
all CRUD assertions. All three strict source checks and targeted browsers3
pass. Product code is unchanged; full final exact checks remain pending.
The original coverage-gate failure remains private evidence, not a disabled
check or updated deferred hash.
