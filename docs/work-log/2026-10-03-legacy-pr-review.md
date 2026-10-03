# 2026-10-03 — Remaining PRs in the legacy repository

The maintainer requested transferring the registration-response presets to
`vpsfreecz/vpsadmin-webui` and checking what else remains in `Kerrycek/clankerdev`.
The new repository had no open PRs at inspection. The old repository had the six
open PRs below. This inventory is not approval to merge or deploy them.

| Legacy PR / inspected head | Finding and disposition |
| --- | --- |
| [529](https://github.com/Kerrycek/clankerdev/pull/529), `169ad7fa` | Requested transfer. Import only the preset feature commit, retaining its author and linking its origin; do not merge its older base history. Reconcile workflow text with the current review layout and adopt its new browser spec into strict E2E coverage. |
| [528](https://github.com/Kerrycek/clankerdev/pull/528), `94784cf4` | Two commits redesign per-VPS migration around a searchable destination dropdown and visible timing/reason/options. The new picker/model are absent from canonical main; its two legacy CI checks passed. A separate feature PR needs reconciliation and current checks before review. |
| [530](https://github.com/Kerrycek/clankerdev/pull/530), `e0f99d8f` | Still contains unported detailed action contracts, requirement evidence/domain coverage, configuration/development/troubleshooting and handover chapters. Its latest static CI passed but browser CI was cancelled. It partly overlaps the new repository's handbook and October operations update; those updates did not import this PR. Adapt it separately, especially its old config.js/secret-environment startup description and 67-requirement coverage (canonical main now has 70). Do not overwrite the newer credential/config.json/NixOS documentation wholesale. |
| [496](https://github.com/Kerrycek/clankerdev/pull/496), `3fd3a5dd` | User-data search/pagination and URL history. Declares a dependency on explicit API ordering in backend PR44. Its scoped older live evidence does not establish compatibility with the current deployment. Not transferred here. |
| [507](https://github.com/Kerrycek/clankerdev/pull/507), `7014276a` | IP-assignment history cursors and error recovery; stacked on PR496 and declares backend PR44 tuple-cursor dependency. Not transferred here. |
| [509](https://github.com/Kerrycek/clankerdev/pull/509), `e94b920c` | Dataset/snapshot ordered cursors; stacked on PR496 and declares backend PR44 dependency. Not transferred here. |

[Backend PR44](https://github.com/vpsfreecz/vpsadmin/pull/44) was open and unmerged
at inspection. Its historical approval/rejection discussion is not new authority
to revive or release it. The cursor PRs require a separate contract decision and
coordinated exact-candidate verification; no backend source or deployment changed.

The preset import changes REQ-038 and preserves the current owner-scoping and
registration/account-change layout work. Existing preset bodies, custom-text
behavior, application-language selection and mutation guards remain the scope.
Original preparation evidence and current transfer checks are tracked in the
[preset work log](2026-09-28-registration-reason-presets.md).

No other legacy PR was imported, closed or edited. No message was posted to its
authors, no automation resumed, and no runtime release was performed.
