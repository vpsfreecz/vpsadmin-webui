# Compact tracked-action history in Tasks

Date: 2026-10-27. Requirements: REQ-010, REQ-012, REQ-051.
Status: prepared for separate review; not merged or deployed.
Branch: `dev/tasks-compact-history`, based on `9113caa0915b`.

## Request and decisions

The maintainer finds the right-hand Tasks drawer's recent cards too tall and
asks for roughly half the height. This addresses tracked actions (`Your actions`),
which still used the older large success cards after the chain-table redesign.

- Compact title/state, receipt/chain and target metadata, then time/step count
  beside Hide. Matching receipt and chain IDs appear once; different IDs
  remain visible. Title plus chevron opens the existing full inspection rather
  than repeating a separate Inspect button.
- Completed cards use a neutral surface and status badge instead of a large
  green area. Remove the completed progress bar, redundant 100% and repeated
  update-time line. Both timestamps and complete progress remain in inspection.
- Known progress retains count and percent; active progress also has an accessible bar. Failure
  summaries remain visible, including long unbroken diagnostics. Unknown totals
  produce no misleading bar. Existing status interpretation is unchanged.
- Hide uses a named 16px icon, keyboard focus and a 44px coarse-pointer target.
  Tasks has no pin/unpin controls or pin groups, including inspection/background
  chains. Existing scoped pin preferences remain for transaction/history pages.
  Inspection, target/chain navigation, search, dismissal and cancellation
  keep their existing semantics. Hiding removes local tracking, not API history.
- Use the active UI translator for tracked-action state badges in summary and
  inspection. API action labels stay authoritative; timestamps retain the
  existing browser locale/timezone formatter.

No API/BFF, permission, storage format, server pagination or deployment change.
The inspection query's terminal-poll check now reads TanStack Query's actual
`state.data`, rather than the Query wrapper, so completed inspection stops
polling as intended. Active receipt polling remains enabled and is tested through
a pending-to-finished fixture transition. No work from open PRs #63/#74 is included. Locked terminology revision:
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; both guides read from that Nix input.
The separate KB workflow targets legacy PHP; no claim of external KB validation.

## Maintainability

Extract existing inspection into `ActionStateInspect` and shared presentation
helpers into `taskPresentation`, keeping the summary/query panel under 500 lines.
Remove its resolved oversized-file exception; historical budgets are unchanged.
Moved inspection/helpers now use typed fields/unknown records rather than
transferring legacy `as any` casts into new files.

## Verification

Passed locally with Node 24.21.0/npm 11.19.0 from the pinned fallback toolchain:

- `npm run ci:quick`: documentation, source/security/i18n audits and strict
  typechecks; the existing drawer spec and new spec are adopted (83 checked).
- `npm run ci:tests`: 226 script, 57 BFF and 1,893 unit tests (305 files).
- `npm run build`: production BFF-mode frontend; existing large-chunk warning.
- 36 targeted Playwright checks across Chromium/mobile Chrome/mobile WebKit.

The first local aggregate attempt lacked BFF dependencies in the fresh worktree;
its queue test reported missing `cookie-signature`. Installing the existing
locked BFF dependencies with `npm ci --prefix bff --include=dev` resolved setup;
the complete test stage and build then passed without BFF/package changes.

 Synthetic fixtures cover cs/dark and
en/light, Chromium/mobile Chrome/mobile WebKit, density and overflow, inspect
with Enter, both timestamps, chain and owner-scoped target links, search,
absence of pin controls/groups, Hide, failures/unknown totals and cancellation confirmation.
Existing scope-isolation, completion-toast and transaction readability checks
are included. Inspection polling is tested from pending to completion and then
through a full additional poll interval without another receipt request. The
initial browser draft had three failures because the assertion expected the
wrong Czech existing Updated label; the corrected 33-case run passed, followed
by the final 36-case run including the polling check. Browser fixtures are not live API authorization or deployment proof.

## Implemented captures

Synthetic fixtures, never authenticated production data. The same completed desktop fixture drops from 248px in the baseline capture
to 102px, about 59% less height. Mobile Chrome/Safari cards measure 126px while
retaining 44px Hide targets and 16px glyphs. Tests cap the normal completed
fixture at 150px and verify that no duplicate matching ID or completed bar returns.
Long content is allowed to wrap and grow rather than being cut off.

- [Before, desktop](assets/tasks-compact-20261027/before-desktop.png)
- [After, desktop](assets/tasks-compact-20261027/desktop.png)
- [After, mobile](assets/tasks-compact-20261027/mobile.png)
- [After, mobile Safari/light](assets/tasks-compact-20261027/mobile-safari-light.png)


## 2026-10-28 maintainer review

Remove pinning from Tasks entirely: tracked actions, inspection and background
transaction chains no longer receive pin IDs/callbacks from the shell. There is
no pinned section or pin/unpin control in the drawer. Existing account-scoped
pin preferences are preserved for transaction/history pages; this is not a data
migration. Keep Hide, inspection, cancellation and tracking. Show known counts
and percentage for completed work as well. Tests cover legacy stored pins,
absence of pin controls, inspection and 44px Hide targets; adjust scope-isolation
expectations so stored pins alone do not populate Tasks. Earlier capture/test
notes above describe the initial candidate, before this review revision.
The currently deployed preview `08154f07c9bd` predates this PR follow-up.

Follow-up verification: both branches passed ci:pr (226 script, 57 BFF and
1,893 unit tests plus build). The initial drawer run had obsolete empty-action
geometry assertions after removing Pin; geometry now checks the always-available
Inspect title. A subsequent run passed 31/32 and exposed a flaky storage check:
substring "910" could occur in another task's addedAt timestamp. Parse stored
IDs instead of substring-searching the JSON. This was not a failed dismissal.
The corrected final run passed all 32 targeted checks across desktop Chrome,
mobile Chrome and mobile Safari. Refreshed desktop/mobile captures show the
implemented drawer without pin controls and with terminal percentages.
Strict E2E adoption now includes the updated account-storage isolation spec.
