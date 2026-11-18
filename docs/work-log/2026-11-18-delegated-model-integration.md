# Delegated model choices and preview integration

The maintainer selected DASH-09 A and then explicitly delegated the remaining
waiting model choices to the assistant's judgment on 2026-11-18, with a later
combined review. This supersedes earlier records that required individual model
selection for these eleven tasks. It does not authorize merging PRs, changing the
API, or deploying to newadmin/production.

## Six implementation deltas

- DASH-09 A: recent tasks below the VPS list, visible by default, at most five
  entries, persistent hide/show, existing history and detail routes (PR324).
- DIA-02 A: normal secondary diagnostic links in the existing VPS card (PR325).
  Full administrators retain their VPS context; support remains read-only with
  its existing access restrictions. The cumulative preview retains recent OOM
  reports already deployed, without restoring the superseded subtitle/hint.
- DNS-01 A: Type means forward/reverse; Role means primary/secondary in the
  list, creation and detail. Unknown source stays unknown (PR326).
- DNS-11 B: hide technical record IDs initially; persist an explicit opt-in.
  ID search, record identity and mutation gates are retained (PR327).
- NET-13 A: compact monthly and live summary tables. Measured zero and missing
  samples stay distinct. Charts and breakdowns remain separate (PR328).
- ACT-08 B: open the first failed step after loading, respecting manual choices
  and changing chain identity (PR329).

## Five deliberate retain-current decisions

- DET-04 A: keep VPS tabs and the separate console. Existing navigation offers
  direct access without loading every detail section into one long page.
- DIA-03 A: retain the member's aggregate OOM entry for all their VPS, alongside
  direct per-VPS diagnostic links and recent reports. Administrator global
  navigation is retained. Removing the member entry would lose a useful view.
- NAS-14 A: retain NAS, Backups and administrator Datasets as distinct entries,
  with existing contextual returns. The maintainer's earlier suggestion to unify
  them remains valid review context; this pass deliberately avoids mixing
  primary datasets, NAS and backup recovery scopes into a new storage hub.
- DNS-04 A: retain linked DNS-zone and TSIG-key pages, keeping owner/global
  scopes and stable deep links rather than adding a second tab hierarchy.
- ACT-07 A: retain linked chain and individual-transaction pages, with their
  filters and deep links. They answer different diagnostic questions.

These five are selected retained behavior, not claims that the proposed
alternative layouts were implemented. They require verification on the
integrated preview and should remain adjustable during the maintainer's review.

## Integration and verification boundaries

The candidate starts at the exact paired-preview c1e00278 and applies only these
six focused deltas. Preserve the current published SDK 0.4.0, transport, API
contracts, recent OOM content, DNS TTL/server reporting and unrelated delivered
changes. Normalize the SDK's nullable creation timestamp to an absent HTML
`dateTime` attribute. Merge both UI preference fields and sort the adopted E2E
manifest without dropping prior paths.

Focused PRs have their own native/clean-artifact browser evidence and required
CI checks. Local CI diagnostics are retained; no failure is hidden by changing
assertions or budgets. Integrated checks and paired activation are separate
from those PR checks. Browser API/session fixtures do not establish real account
authorization, OAuth, monitoring timing or physical Safari parity. No live test
objects are required by these changes. Clanker production API checks remain
anonymous read-only. The prohibited build host must never be contacted,
including through Nix builders or delegated tooling.

Localization used the locked terminology guide revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Inline wording and navigation checks
are not a claim that the separate external KB has been updated.

Current state: prepared integration, with qualification and paired delivery
recorded separately in the canonical local operations continuity and evidence.

The first integrated browser run passed 226 configurations and found two stale
administrator-route assertions in the newer preview-only payload regression.
That case clicked the failed step before reading its payload; with the selected
automatic expansion, the click closed it. Update the case to require initial
visibility, manual collapse and reopening, retaining all payload assertions.
The original run and interrupted/not-run cases remain recorded separately.
This is an additional cumulative regression case absent from the older focused
PR base; application runtime content is unchanged by this follow-up.
