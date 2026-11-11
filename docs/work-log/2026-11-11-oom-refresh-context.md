# OOM refresh retains the current query

Approved NAS-02 reviewVersion1b7f7da67f48e41b, human revision333. The full task
compares NAS, OOM and request loading/recovery; it only permits removing a
manual refresh where automatic updates and recovery remain reliable.

Current NAS and member requests have explicit refresh, no query interval.
Administrator requests use the slow tier (visible60s/hidden300s),15s stale time
and explicit error retry. Global staleTime10s does not cause polling, and
window-focus refetch is disabled. The finite rendered audit below confirms these differences; no manual
control is removed by this repair.

OOM Refresh was a link to the unfiltered list. On clean actualDC8, two fresh
unfiltered cases confirm no new read; two settled filtered cases confirm loss
of cgroup/page context and an unfiltered read. Original filtered observation
had an immediate-count timing error; traces retain all3 actual reads and only
the observation wait was corrected. These diagnostic passes confirm existing
behavior, not a fix. A desired-contract baseline is recorded separately.

Change only the Refresh prop to call listQ.refetch. Preserve its label,
dimensions, keyboard behavior, current query/URL/role/owner/cursor/API contracts
and existing error Retry. No new polling, API/BFF/SDK/config/dependency or
locale change. Exact inverse-source comparison restores the old runtime file.

The adopted browser regression tests member/admin/My/support, filtered and
unfiltered reads, fresh-cache manual refresh, changed server results, read
rejection, keyboard Retry, exact query and URL/hash persistence,0writes and
pageerror journals. Both PR smoke tags and an explicit WebKit allowlist entry
are included; actual selectors and type/adoption checks must verify coverage.

Prepared only. Working browser verification, final required checks, identity/
hooks/commit, draft PR, clean Nix/current-browser/CI/paired-preview/TODO gates
remain pending. Full NAS-02 is not complete from this one OOM repair.
Authenticated traffic is intercepted fixtures, not live permission/backend/
OAuth or physical Safari/full-WCAG certification. Private source, original
failures and finite audit live at /data/webui-browser-runner/verification-20261103/
todo-nas02-refresh-audit-20261111. No live identities/objects/DBlocks/API writes.

## Local verification checkpoint

Dirty cumulative20b plus the one-prop repair passes16/16 Chromium/mobileWebKit
cases; focused13a plus the same repair also passes16/16,0retries,16empty error
journals each. These are overlapping executions on different source parents,
not32unique scenarios or clean-artifact evidence. Desired actualDC8 baseline
fourFAIL specifically at A versus BUTTON. Diagnostic original2unfilteredPASS,
2filtered timingFAIL and corrected2filteredPASS remain separately recorded.

A separate private cleanactualDC8 route matrix passes10/10: NAS member/admin,
member requests/admin-My requests, and administrator requests, Chromium and
mobileWebKit. Controlled61s browser-clock advancement confirms only the admin
request index updates automatically in that interval. NAS and member requests
show the new synthetic server result after deliberate manual refresh. Every
case rejects the next read, exposes Retry and recovers to the third result
with exact URL and query retained,0writes/empty pageerror journal. Keep those
manual controls. Administrator requests already have no standalone Refresh
header action; their existing polling and error retry remain.

Pinned Node24.21.0/npm11.19.0, fresh npmci/build/initialciquick pass on both
sources. Final strict checks include the adopted new test; actual Playwright
CLI selects8 cases in each of Chromium, mobileChromium and mobileWebKit.
A temporary JSON expansion failed the formatter, then original formatting
and existing array order were restored with only one adopted test entry.
Original failure logs remain. No debt/compiler/retry relaxation.

Own fixtureTLS2 removed under uid/device/inode/hash/lease/port guards,0remain.
Source and browser reports are private under the task directory. No commit,
PR, clean build, activation or TODO done claim is made by this checkpoint;
those release gates remain separate. Both current previews are still part of
NAS06's guarded delivery and this OOM repair is not included in that artifact.
