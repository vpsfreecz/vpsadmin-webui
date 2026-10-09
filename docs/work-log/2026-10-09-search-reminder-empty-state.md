# Compact search-scope hint only for empty results (2026-10-09)

The maintainer found the PR36 warning too prominent, especially when an owned
VPS hostname already matched. This supersedes its always-visible behavior for
REQ-070, retaining explicit view switching and REQ-010 keyboard/touch controls.

The shared hint now uses small muted text and a ghost action, without a warning
panel or long explanatory paragraph. Header and command palette display it only
when the current query has completed successfully with zero results. Debouncing,
in-flight requests, stale empty results, errors and successful owned matches do
not display it. Empty/help queries and incomplete palette qualifiers are also
excluded. No change to search scope, API calls, authorization or switch routing.

Existing Czech/English copy is retained; locked terminology source
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` guides were resolved and read via Nix
on the build-capable newadmin host after dev's full root filesystem prevented
source import. No deployment or runtime change was made on that host.

Browser regression coverage checks an owned hostname after an empty result,
a held response during a changed query, errors, explicit keyboard/touch switch,
normal member exclusion and compact dimensions in cs/en. This change is prepared, not merged or deployed; external KB
captures have not been republished.


## Verification and visual evidence

- `npm run ci:pr` passed under the pinned Nix Node 24 toolchain: audits,
  lint/format checks, TypeScript, 226 script tests, 57 BFF tests, 1,770 unit
  tests and the production build. The existing bundle-size warning remains.
- Candidate browser tests use synthetic API fixtures on an isolated Vite preview
  on the dev build host, reached through a localhost SSH tunnel. They do not
  certify live API data and do not alter the publicly deployed dev application.
- The first browser run passed 30/32 cases; two stopped at application bootstrap
  before reaching search controls. Its shared Vite dependency cache was removed
  from the verification setup by assigning a task-specific cache. The complete repeat passed **32/32** in 5.7 minutes
  across desktop Chromium, mobile Chrome and mobile WebKit, without retries or
  page errors. Their original cause was not captured, so cache isolation is a
  verification precaution, not a claimed application bug fix.

Screenshots show the implemented UI with synthetic data:
[desktop empty result](../design/images/search-reminder-empty-state/desktop.png),
[mobile empty result](../design/images/search-reminder-empty-state/mobile.png),
[mobile owned VPS match](../design/images/search-reminder-empty-state/owned-result-mobile.png).
The desktop background profile may still be loading; the search itself has
settled with no results.

- `npm run audit:design-docs` and `git diff --check` passed after adding the
  work log and visual evidence. No hook framework or enabled local Git hooks
  were declared. Review branch: `dev/search-reminder-empty-state`.
