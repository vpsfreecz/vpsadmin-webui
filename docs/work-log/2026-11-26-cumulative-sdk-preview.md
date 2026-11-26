# Cumulative preview on the current SDK — 2026-11-26

Requirements: REQ-046, REQ-060–064, REQ-068.

This source is for dev.crucio.cz and clankerdev.vpsfree.cz previews. It combines
the approved SDK integration with the exact already deployed preview baseline
`73a4bd03fe677e5973e27b25313b37f142439d3c` through ordinary merge ancestry.
Existing preview features and their original authors/history remain available.
The separately prepared approved release candidate is the production handoff
source; this cumulative branch is not an implicit production approval.

Held NAS/capacity, backup-statistic, DNS, network-chart and dashboard review work,
plus the previously deployed shared-login and IPv4-rejection fixes, remain preview
work at their current review status. This merge does not approve those TODOs,
merge their original PRs or add their features to the approved-only candidate.
The actual human approval/comment fields remain unchanged.

Current published SDK0.6.0 and HaveAPI0.32.0 contracts, current main transport,
capabilities and action receipts take precedence. The administrator incident
Overview/History, policy filter and notice summaries remain alongside the accepted
readable controls. The already deployed touch/layout, backup statistic links,
DNS configured-serial interpretation and recent-task display preference remain.
The extracted host-address filters render the existing preview markup. No prior
preview behavior is intentionally rolled back to satisfy production scope.

Catalog integration uses the locked terminology guide
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, with both complete guide files read.
Current incident catalog keys and distinct preview additions are retained in
both locales. Dated evidence conflicts retain separately labeled accepted-source
and existing-preview records. Those historical observations do not certify this
new source or change any review decision.

The browser project selections and strict adopted TypeScript sources are unioned.
Positive fixture responses retain explicit generated namespaces; an old namespace
fixture's missing return is corrected. A duplicated optional pathname declaration
introduced by the mechanical merge is removed without changing its behavior.
Incident pending-router fixtures include current wrapped capabilities/registry
responses and keep the original navigation/scope assertions. Existing structural
budgets and retry/skip policies remain gates; final checks are recorded separately.

Initial source diagnostics found the duplicate pathname declaration and retained
its failed log; correction and complete source qualification are still pending.
No runtime deployment is claimed by this prepared merge. Local builds and
evidence remain under `/data` with remote builders/hooks disabled. The agent
never accesses build.vpsfree.cz. Clanker uses the production API, so its browser
checks remain anonymous read-only or intercepted fixtures. No backend, production
configuration pin or newadmin activation is included.
