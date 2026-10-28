# Synchronous admin-team preference on VPS maintenance — 2026-10-28

REQ-023. Prepared while the maintainer reviews the three-site release. They
explicitly request fixing this before merge/deployment. No production mutation
is repeated. The screenshot's missing-action-state error is in the independent
admin-team preference card; it does not establish that Sunday itself failed.
Read-only vpsfreectl confirms the reported VPS currently has Sunday 02:00–05:00.

The site's API source at `4a21dd25b23de9832166def98526f410416b651e`
contains an `allow_empty` VPS update chain. An isolated
`allow_admin_modifications` change is a DB-only change and is saved immediately
when the chain is empty. The WebUI previously required an action-state ID anyway,
then persisted an uncertainty lock and blocked the adjacent schedule controls.
Its fixture had modeled every successful preference write as asynchronous,
which missed this actual backend contract.

Allow successful receipt-free responses only for a payload containing exactly
that boolean field. Reject malformed supplied receipts and mixed payloads;
retain all other blocking-action checks and the existing lifetime exception.
On immediate completion, keep the mutation pending/locked until a fresh read of
the frozen VPS ID confirms the exact boolean. Continue polling a valid supplied
action state, and preserve ambiguity guards for malformed receipts and network
failures. No fabricated task, automatic retry, global lock clearing, API/default
consent change, credential change or production write is introduced.

Tests cover immediate saves, delayed read-back, mismatch/load failure, existing
async success/failure/unknown status, malformed receipt and permission/state
restrictions. Sunday-only writes must send no VPS preference update; a deliberate
preference save must send no maintenance request. Include actual browser failure
before the fix, candidate results and rollout in the release receipt.

Existing persisted uncertain operations are not blindly cleared by a software
update. The operator must inspect the affected object/Tasks and use the existing
explicit reconciliation control if a previous ambiguous attempt remains locked.


## Verification before review

ci:pr passed: 226 script, 57 BFF and 1,899 unit tests plus production build;
20 focused blocking-VPS contract tests passed. Strict E2E types and regenerated
inventory passed without route/module changes.

The new delayed-read-back regression fails on the currently deployed dev bundle
in both mobile WebKit and Chrome: the old code retains an uncertainty marker
for an acknowledged synchronous write. Browser data/session responses are local
synthetic fixtures; the only real production API operations were reads.

An exploratory candidate run showed import/HMR failures and a Loading-only
screen in an existing support case while artifacts were emitted inside the
watched checkout. Retain those traces, move generated results outside the
checkout and rerun the entire scoped suite with zero retries. Do not label the
interrupted/failed first run green or relax permission/receipt assertions.
Targeted final browser and combined release outcomes follow in the release
receipt; they remain pending at this feature commit.
