# 2026-10-20 — Default member soft-delete expiry

Requirement: REQ-040. Prepared for review; not merged or deployed.

The maintainer requested a one-month expiration suggestion when selecting
soft_delete in the member administration form, without changing the API.
Previously the selection only supplied a date when the field was empty, so a
suspended member's old expiration remained unchanged.

Switching the draft state to soft_delete now replaces any previous expiration
with one calendar month from the current local date/time, rounded to minutes.
Clamp to the target month's final day: January 31 becomes February 28 (29 in a
leap year), not a date in March. This is a suggestion in the draft: an administrator
can override it before Save and the existing target/state confirmation. Selection
alone never calls the API. Other state selections preserve the expiration;
opening an already soft-deleted member does not change its saved deadline.
No backend, API adapter, permissions, reminder handling or retention policy changes.

The page's existing structural-debt allowance is unchanged: the one-condition
edit was reviewed and its content hash refreshed with that rationale. The touched
member-detail browser suite is adopted into the existing checked E2E TypeScript
inventory; deferred baselines are unchanged.

Verification uses the local Node 24 fallback because Nix is unavailable here:

- All 300 unit-test files / 1,864 tests passed, including five calendar cases.
- Member-detail Playwright suite: 26 passed on desktop/mobile Chromium, using
  synthetic API fixtures. Checks cover empty/existing expiry, local-time/UTC
  conversion across the Prague DST boundary, manual override, reselecting the
  state, confirmation before mutation, request payload and persisted draft.
- `npm run ci:quick` passed, including strict E2E adoption, type checks,
  formatting, lint and documentation/security/structural audits.
- Production build passed with existing chunk-size warnings.
- Temporary fixture screenshots show the implemented desktop/mobile form after
  selecting soft_delete on October 20: November 20 is suggested. Captures remain
  outside the repository; they are not evidence of a dev/production deployment.

No real member was modified or deleted. This targeted frontend change does not
claim full live account lifecycle certification (REQ-039).
