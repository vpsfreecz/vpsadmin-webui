# Selected PR release — 2026-10-27

Status: authorized candidate; combined remote checks and deployment pending.
The maintainer explicitly approved our PRs #88–#95 and conditionally included
PaulosV PR #87 after security review, then requested deployment everywhere
(dev.crucio.cz, clankerdev.vpsfree.cz and newadmin.vpsfree.cz).
Aither PR #74 and ETNyx PR #63 are explicitly excluded and remain untouched.

Requirements: REQ-020, REQ-023, REQ-048, REQ-050, REQ-051, REQ-068, REQ-076.
Base main is 5a2d2bdc3ad7a827038f877d75959916528db844. The existing dev
preview and production runtime receipts are historical observations; recheck
them before activation.

| PR | Selected head |
| --- | --- |
| #87 | `80cd7d4da048164b96a29dc8a9e4e58891e40fc0` |
| #88 | `5cd07a805ca682d7cb3e43e3a31030e348e61850` |
| #89 | `5c29bc1d587ee4b1e4f5807f75c1dbff99abeb98` |
| #90 | `a11a5b2d6d90bd9447355a6edb825b72150df3a6` |
| #91 | `c07bd9f38a8ee40bf1f043d5ff5749253108d819` |
| #92 | `23c15b28c2a2f8d09da1e5aea19ed342da021da1` |
| #93 | `a14fff06fe01301db12673b427c819baa11ffaa8` |
| #94 | `af0af6bded8184991e2938b36c5e35a5f5679b3e` |
| #95 | `e0abc0be663709d46b3dbe00b6e1a97cf0c0dfe4` |

## Bounded review of PaulosV PR #87

Inspected the entire one-file diff at 80cd7d4d and its original author
Pavel Valach. Exactly four Czech string values change in
`src/i18n/locales/cs/vps/console.ts`; keys, placeholders and English text
are unchanged. No markup, links, script, dependencies, workflow, API calls,
permissions, persistence or token handling are added. The changes improve
the distinction between Cancel and the destructive confirmation.

Read both locale variants and the ConfirmDialog consumer: cancellation only
closes the dialog; confirmation retains the existing target-bound revoke
mutation and pending/error safeguards. The strings are plain React text.
No security or correctness blocker was found in this limited diff; this is
not a security certification of the whole console implementation.

The locked terminology guides at vpsAdmin revision
a65a4dfeb92a59df4a80a737a20bcbf8558793ff were read from the flake input.
The phrase Ukončit relaci follows the guide. External legacy KB publication
is not certified by React fixtures; no PHP/API/KB pin was changed.

The console browser spec adds cs/en cancel-versus-confirm checks: the two
visible names differ, the reviewed VPS target is displayed, Cancel sends no
DELETE and preserves the iframe, and confirmation sends exactly one DELETE
and ends that synthetic console session without recreating it. All 27 console
cases passed across Chromium, mobile Chrome and mobile WebKit. No real
console session or token was created/revoked for these fixture checks.

Original PaulosV authorship is preserved by merging his commit. Our review
adds tests and this documentation separately; it does not rewrite his branch.

## Integration and release gates

The nine selected heads are retained as ancestors of one integration candidate.
The prior preview already combined our eight PRs and passed ci:pr, 129 source
and 129 deployed-bundle fixture checks plus three unmocked anonymous contexts.
Run current combined checks and the required remote CI on this final candidate;
do not infer success from historical preview or individual PR results.

Before merge, recheck exact heads/current main and retarget our feature PRs
from the security branch to main for combined integration. Merge only the
authorized source and preserve both excluded PRs. A resulting merge commit
may have a different SHA but must retain the reviewed tree.

For newadmin, generate one WebUI input update with confctl and preserve its
message/hooks. Inspect the running generation and other upstream configuration
changes; build against the deployed base when needed to avoid an unrelated
system/other-input upgrade. Publish only the generated WebUI pin patch on
current configuration master. No release receipts/screenshots go there.

For the older hosts, retain paired frontend/BFF rollback, credentials, sessions,
config hashes, old assets and deployment-lock protection. Inspect live provenance
and active work immediately before promotion. Repeat auth/provenance/API-origin
and browser acceptance with exact scope; fixtures remain distinct from live API.

Console screenshots show the implemented combined candidate with synthetic data:
[desktop](screenshots/2026-10-27-release/console-desktop.png) and
[mobile Safari](screenshots/2026-10-27-release/console-mobile-webkit.png).

Append actual CI/merge/deployment results rather than anticipating them.
