# Kernel OOM report reading and recovery — 2026-11-15

Status at preparation: working change, not published, CI-qualified or deployed.
Approved OOM-01 `a04936fda93aee28` and OOM-02 `476e56eca840980a`;
REQ-010 and REQ-051. Update existing own draft PR243 without rewriting its
pending-router filter snapshot correction or propagating the new head into
already completed dependent PRs. Focus parent is4df369be; cumulative parent
is the verified incident preview f1f829a6.

The original public feedback's Processes image depicts read-error recovery,
not process mutation actions. The actual dev asset baseline confirms generic
list wording, a duplicate small detail heading and repeated diagnostic metadata.
It also confirms that Retry/Back are boxed while Status/Copy details are ghost
controls. These fixtures intercept API/session data; they are not live permission
or historical kernel/process evidence.

The list now explicitly names kernel OOM reports, without its redundant intro.
The detail retains its main report heading, state badge and Open VPS/Rules
buttons, and removes the duplicate small kicker and header metadata row.
Unique created_at, VPS and node values move unchanged into Summary; reported_at
remains separate. Full cgroup, killed/invoking process, count, rule, usages,
statistics and process fields remain available. The removed small kicker's list
link is intentionally removed with that heading; sidebar navigation, browser
history and the existing detail tabs/actions remain.

Only the OOM process-read error opts into trailing, consistently bordered
Retry, Back, Service overview and Copy details controls. The overview link
retains `/` and its existing authenticated redirect to `/app`. Copying retains
complete diagnostics and Details remains a native keyboard disclosure.
Other ErrorState consumers retain their existing default alignment, variants,
labels, callbacks and copy sizing. No fake process mutations or new operations
are introduced. Existing API permissions, duplicate-operation locks and uncertain
request behavior are unchanged.

## Focused compatibility and safety

The old focused PR predates our own merged PR200 process pagination fix41ba4806
and its32ffb9fb browser fixture correction. Its fixed2000-process request exceeds
the real API limit. A minimal compatible prerequisite retains its legacy
HaveAPI namespace/typed array transport, adds from_id and abort signal, and
uses the existing bounded ascending cursor view with at most101 lookahead rows.
No generated SDK, dependency, backend or transport upgrade is imported. The
current cumulative branch already has this behavior; its adapter is unchanged.
The API inventory must be regenerated for the focused adapter change.

The actual API22adc/PID1787468 and28 tracked contract files were inspected
read-only. Nonadmin OOM ownership restrictions and task/usages/statistics reads
remain server-governed. No API activation or live mutations/objects/accounts.
Locked terminology input `a65a4dfeb92a59df4a80a737a20bcbf8558793ff` and both
required guides were read. Kernel is Jádro; Status remains Status, with the
explicit service destination named in its localized control. Standalone KB
impact is read-only and does not authorize an unrelated API pin or publication.

## Prepared verification

The immutable actual baseline v2 program is
`72b8c7678cf646d3e20c344b30fc04686e117e4e11bfc2f46d8b5448ac38b700`.
Eight contexts passed with48 raw captures and20 selected images individually
reviewed, zero retries/failures/flaky/skips/live writes. The initial v1 run's
English Retry selector error is preserved with its original source/logs:
4passed/2failed/1interrupted/1notrun; it is not an application defect.

Sixteen new fully strict cases cover CS/EN member, admin, admin My and support
reading, missing references, distinct timestamps/full diagnostic values,
keyboard navigation, native status/back/retry/details, clipboard payload,
read-only bounded requests and unchanged default statistics error presentation.
The existing long-cgroup test now asserts absence from the removed header and
retains complete text, wrapping/edge/overflow and action visibility checks in
Summary/rule. Both touched specs are fully adopted, without changing baseline
hashes or adding deferred allowances. The unchanged controlled filter-help view
is extracted to keep the large list inside its1211-line structural ratchet;
its parent insertion callback, focus ref, role keys and examples remain.

Focused typecheck and18 relevant unit cases passed before the final extraction.
Both initial strict browser preflights passed; full quick/build, source-bound
browser, exact committed/Nix, six original CI checks and paired/protected
qualification remain pending. No production/newadmin, merge/approval, backend
activation, prohibited builder, scheduler change or global readiness claim.
Private durable evidence: `/data/webui-browser-runner/verification-20261103/
todo-oom-reading-actions-20261115`. Browser WebKit is not physical Safari.

The first complete current working cohort passed130cases and failed one mobile
WebKit case at Back after visiting `/`. Its original program/log/context are
retained. Both pre-existing PublicLayout versions replace authenticated `/`
with `/app`; the test observed only the transient root before going Back. The
regression now waits for exact `/app` and the rendered dashboard, then asserts
the returned task path and unchanged error/Back behavior. Routing is unchanged.
The destination is labeled Service overview / Přehled služby to describe the
existing target honestly. Full qualification must be repeated for final text
and regression source. This is not a larger timeout, retry or weaker assertion.

## Final working qualification

Both final-source full repository quick checks and production builds passed.
Focused29/current65 relevant unit cases passed, including the existing public
layout authenticated redirect tests (9/16 cases respectively). Strict browser
coverage is117checked/172deferred focused and270checked/96deferred current;
immutable baselines and remaining deferred source hashes are unchanged.
The final canonical16-case source hash is
`afeb6dfb590c44561b1d3e0b832b7a8edf5ce9b1466fbb7dc021165e5e3c7bd7`.
Final working source-bound cohorts passed89focused and131current executions,
zero retries/failures/flaky/skips. Four additional final canonical WebKit
recovery diagnostics passed separately; these cohorts overlap and are not
unique totals. The original current130PASS/1FAIL cohort remains preserved,
not relabeled or hidden. No routing or application history code was changed.

Fixed-ref AST checks also preserve the task error's retry/title/error props,
public layout/Button/LinkButton/CopyButton/shared Help/public-page routing,
all other OOM locale values and the extracted help's exact examples/keys.
The focused API inventory was regenerated with no generated inventory diff.
Project build/CI tooling was inspected: hosted Ubuntu/pinned Node/npm frontend
checks, no SSH/self-hosted/prohibited builder/deployment execution in the
triggered frontend workflows. Local Nix still requires explicit empty builders,
empty pre/post build hooks and the public cache. Exact committed/Nix/browser,
original six hosted CI and paired/protected publication remain separate gates.

Eight separate local production-build diagnostic images were individually
reviewed: CS dark member / EN light admin, desktop Chromium1440 and mobile
Linux WebKit320, overview plus process-read error. Full cgroup/context and
wrapped trailing controls remain readable. Existing memory-table horizontal
scrolling remains. These dirty local images are not deployed before/after proof.
The first local visual harness stopped before rendering because it copied the
strict dev-only origin fixture. Its original program/fixtures/report remain;
reuse the already qualified strict localhost-only harness and hash-bind those
fixtures. No origin guard, application assertion, retry or timeout was weakened.
The corrected four-context/eight-image run passed without retries or live writes.
