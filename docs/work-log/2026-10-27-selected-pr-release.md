# Selected PR release — 2026-10-27

Status: completed. The selected PRs were merged through PR #96 and deployed
to all three WebUI hosts. Clean runtime revision:
`2d361c571eac6ae4cd2e12140b013c0e3fadb926`.
This later documentation-only receipt does not advance the runtime pin.
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

## Integration and release gates (preparation record)

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

The completion receipt below supersedes the preparation-time pending states.

## Completed CI and integration

The exact runtime candidate passed all six required remote checks:
[CI/build/scripts](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40585357862)
and [Playwright](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40585357994).
The complete browser suites passed 585 desktop Chromium, 527 mobile Chromium
and 227 mobile WebKit tests. The desktop run took 26 minutes; it completed
successfully on its first attempt. No test/gate was disabled or weakened.
Combined local ci:pr also passed 226 script, 57 BFF and 1,893 unit tests plus
the production build. The targeted console review passed 27 browser cases.

[Integration PR #96](https://github.com/vpsfreecz/vpsadmin-webui/pull/96) merged
at 2026-10-27 21:44:24 UTC as
`885a9f28a4da1b0fdad3406ddeb90262242093e5`. Its Git tree equals the reviewed
runtime candidate's tree. All nine original PRs #87–#95 are marked merged;
PaulosV's original commit/author is retained. Immediately before merge, all
selected heads and unchanged main were rechecked. Only our feature PRs were
retargeted to main for the combined merge. Excluded #63/#74 remain open at
the same heads and were not edited, reviewed, merged or deployed by this task.

## Package and host activation receipt

Clean standalone x86_64-linux frontend/BFF builds and provenance, source-content,
package-content and NixOS module-evaluation checks passed. The site-specific
frontend/BFF package-content check passed separately. All runtime packages report
the same full clean revision above, independently of Git main's merge/docs SHA.

| Host | Runtime/activation | Verification |
| --- | --- | --- |
| dev.crucio.cz | Paired frontend/BFF pointers promoted from 2a70ca791c67 under the dev lock. | Auth smoke, process cwd, metadata, config hashes and 33 deployed-bundle browser cases passed. |
| clankerdev.vpsfree.cz | Paired pointers promoted from f7a8f10cbb94 under its deployment lock. | Auth smoke, process cwd, metadata, config hashes and 33 deployed-bundle browser cases passed. |
| newadmin.vpsfree.cz | confctl generation 2026-10-27--22-31-44 activated with dry activation and automatic rollback enabled. | All seven health checks, auth smoke, package/runtime metadata and 33 deployed-bundle browser cases passed. |

Newadmin's active system is
`/nix/store/2vnpn1f65a58pgrmrmxr3dwnw785v9x3-nixos-system-vpsadmin-webui1-26.05.20261019.f3a73bc`.
Its site frontend is
`/nix/store/m0yx2qm04kqbjjcfm4ivdywwnda4ysd4-vpsadmin-webui-frontend-1.0.0`;
BFF is `/nix/store/1crc7axcr0fn8d5359k6q4rl3gc2wz2r-vpsadmin-webui-bff-0.1.0`.
The source-only standalone artifacts were
`/nix/store/95xaas16fbrfkbclls22c38y1h6hpna4-vpsadmin-webui-frontend-1.0.0`
and `/nix/store/xxk7rkkl3mcgs7f9apkqn9kj2xwkqx11-vpsadmin-webui-bff-0.1.0`.

The configuration deploy checkout retained the live nixpkgs f3a73bcf and
vpsadminos f4bac6b4 pins; it changed only WebUI over the previously deployed
base. Dry activation copied only the selected WebUI/service/configuration
metadata changes. The site's effective API/terminology input remained
4a21dd25b23de9832166def98526f410416b651e; its session terminology was reviewed
and agrees with the selected Czech wording. No OS, API, database, console-router
or unrelated application update was activated.

## Browser evidence and limits

After activation, the selected feature acceptance ran against each host's actual
HTTPS-served assets: 33 cases per host across Chromium/mobile Chrome/mobile
WebKit, covering all new functional areas and the Czech console confirmation.
These 99 cases supplied synthetic BFF sessions and API fixtures only inside
the test browsers and blocked direct real versioned-API requests. They did not
remove real packages/snapshots or revoke real console sessions. This is not
a live authenticated API authorization/mutation certification.

Separately, nine unmocked anonymous browser contexts passed across the three
hosts/engines: exact clean revision, About/commit navigation, fitting layout,
required authentication for admin routes, asset MIME/status and no JavaScript
exceptions. Runtime configuration still points dev to https://dev.crucio.cz
and both public sites to https://api.vpsfree.cz. TLS verification was relaxed
only for dev's existing certificate issue. Newadmin's actual CSP retains the
console and heatmap frame origins and the exact payment-QR image path.

Existing credentials and live sessions were preserved; older-host nginx/unit
configuration hashes were unchanged and retired secret environment variables
remained absent. Paired old releases and newadmin's previous generation
`/nix/store/iziph2f0ix2rgzdq4i627a17m5hyhvkx-nixos-system-vpsadmin-webui1-26.05.20261019.f3a73bc`
remain available. No rollback was needed. Restoring an application generation
never means restoring old refresh-token session files.

## Configuration publication and housekeeping

The single published generated input-only commit is
[38f573b4](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/38f573b49000b649f0951e3a627554789ad34d63).
It changes only vpsadminWebui's locked metadata in flake.lock, retaining the
generated confctl message and the verified contributor identity. Concurrent
master update f8387df1 (Jakub's devWorkspace pin) was preserved by rebasing only
our unpublished input commit and using a normal fast-forward push. No published
history was rewritten. No receipt, screenshot or generated report was added
to the configuration repository.

Overcommit initially refused the custom Nixfmt hook because only the config
signature had been accepted. The hook was inspected, signed explicitly and
rerun inside the pinned Ruby dev shell; it was not bypassed. The first build
invocation stopped at its noninteractive confirmation prompt; repeating with
--yes implemented the already authorized single-host build. Neither setup
attempt changed a live service or bypassed a release gate.

After the builds, standard Nix GC, within the maintainer's earlier explicit
cache-cleanup authorization, removed only unused store paths with a 3 GiB
bound. It freed 3.0 GiB (5,017 paths); dev root free space rose from about
3.5 to 6.8 GB. No profile/generation or VM disk deletion was requested. All
ten pre-existing qemu-kvm processes remain running with starts predating this
release; both dev BFF services and nginx remain active. The initial VM helper
matched qemu-system names only; actual qemu-kvm liveness was checked separately
rather than treating its zero match count as proof.

All serving revisions were rechecked after activation. The separate default-
branch CI jobs are not substituted for the green exact-runtime PR checks above.
Later documentation commits do not require another service release or pin bump.
