# Network graph orientation

NET-14 follows the approved version `18e08dc2a2eb0037`,
[Discourse post 22](https://discourse.vpsfree.cz/t/372/22), REQ-050 and
REQ-010. Monthly traffic and live ingress/egress need visible time and value
scales, including at 320 px. The same presentation applies to administrator My
view and the filtered administrator live dashboard.

Opt these five existing chart calls into the shared axis presentation already
deployed for VPS history. Retain their existing value/time formatters, monthly
byte totals, shared ingress/egress maximum, rate division by the API delta,
history limits, query filters and polling. Monthly values use IEC bytes; live
values use IEC bytes per second. Preserve point inspection with keyboard and
touch, including the first isolated measurement. Empty API results keep their
existing separate empty panels and omit charts. A transient empty chart history
uses the shared localized No data fallback; a measured zero remains selectable.

The cumulative runtime changes these call-site props and focused point retention. The older focused
experiment base needs the already deployed shared chart implementation as a
rendering prerequisite (our commits 77a3e13, 6ddb697 and ff93f4a); it adds no VPS caller
feature, backend support, SDK upgrade or new dependency. Other current shared
chart call sites remain byte-identical. The API remains authoritative for owner
restrictions; fixtures do not prove live permissions.

Actual dev baseline 159f93f6: four fixture/session contexts, ten unaltered
screenshots, all individually viewed. All five call sites omit axes. The first
paused administrator read has one history sample, which the previous compact
chart cannot inspect. The final frozen comparison first performs one explicit
read-only Refresh for a two-point baseline. Date alone is fixed for identical
fixture timestamps; browser timers remain real. Mobile full-page capture resets
scroll and pointer after point inspection. Original failed/earlier capture
programs and reports remain in private evidence.

New strict browser scenarios cover CS/EN, light/dark, member and admin/support
My ownership, administrator filtering, scales, point values, keyboard/touch,
the first sample, zero/empty and read errors. Existing network filter/polling
and VPS history checks remain separate regression evidence. Complete focused
and cumulative quick/tests/build, clean local Nix outputs, source-bound browser
checks and six original focused-head hosted checks are required before paired
preview activation. At preparation these qualifications and publication are
pending; this entry does not claim delivery.

Terminology input: a65a4dfeb92a59df4a80a737a20bcbf8558793ff; both locked guides
read. No catalog text, API adapter, BFF, permission, mutation lock, dependency
pin or backend timing change. All data are synthetic, no live object/account
creation or migration. Clanker actual checks remain anonymous read-only;
no physical Safari/display, backend throughput or OAuth certification.

The existing own-scope address fixture also failed against the exact unchanged
clean 159f parent artifact: current address handling revalidates incomplete
assignment relations through the specific owned VPS. Supply that authoritative
current allocation in the fixture, preserving its null owner instead of inferring
ownership from the assignment actor. Retain both expected addresses, exact
assignment owner/active filters and the foreign-address negative assertion.
Allow at most one read of VPS 123 limited to 250 rows, or the legacy path with no
revalidation read; every address request must be scoped to owner 7 or VPS 123.
This corrects the stale blanket prohibition on legitimate VPS revalidation.
It does not change address runtime, permissions or requests. Both original
browser failures and the unchanged-parent diagnostic remain private evidence.

An unchanged-parent passive diagnostic also reproduced the existing mobile
VPS-history touch failure. Touch selects the last point, then an emulated
mouse-leave event clears it while the chart still holds focus. Retain the
selected point when the chart has focus; Escape and blur still dismiss it,
and an unfocused hover still clears on leaving. Preserve the original VPS
touch assertion and add explicit focused/unfocused pointer-leave coverage.
The original failed run has no event trace; the separate diagnostic preserves
its complete passive trace and clean parent provenance. No calculation, query,
server permission or polling change is involved.
