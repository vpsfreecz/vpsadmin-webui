# Dev preview: public preferences, overview and authenticated navigation

Status: deployed to dev.crucio.cz only on 2026-11-01 at 21:57 UTC.
Feature PRs remain open; production is unchanged.
The maintainer requests all current chat UI changes on dev for review.

## Exact scope

Start from the actual paired dev release
`70bd11d983e7dfd11f99604791ad68562807ee2e`. Apply only our feature deltas:

- PR123 `e8576c57ea83b1b24e6698dd55d2059ed16f0c32`: anonymous theme choice.
- PR124 `af5751515219c852fa6e479cc8109014dff52568`: localized news, simplified
  public cards/headings, heatmap explanation and prioritized public sections.
- PR125 `fa91c6883d468e39eae1dcf7eff628828419db13`: authenticated sidebar controls,
  a session-setting deep link, bounded popovers and small-window navigation.

Shared main includes independently merged HaveAPI-client changes which are not
part of the selected release. Preserve them on main, but do not release them
implicitly. This preview applies the feature patches over the running release;
it does not merge the PRs or change production. PR116/117 and colleague PRs
63/74/115/122 remain excluded.

The existing anonymous `publicApiCall` transport and encoded-query expectations
are retained; PR124 only adds its bounded published-advisory helper. Runtime
HaveAPI, dependencies, package hash, BFF, API and DNS source remain at the
approved running basis. Resolve documentation/coverage conflicts by retaining
that basis plus the three requested feature deltas. No history rewrite.

## Verification and activation plan

Build clean paired Nix frontend/BFF packages under /data after checking the dry
run and disk headroom. Run combined quality, unit/script/BFF checks and served
fixture acceptance on the development-machine runner. Wait for original-head
CI and verify the selected combined source before activation.

Use the existing dev deployment lock; recheck the expected running pair and
configuration hashes. Validate candidate configuration under the existing
systemd credentials without printing values. Preserve sessions, secrets,
API/VM state, other services, current hashed assets and a paired rollback.
Activate only the dev pointers, with rollback on failed health/provenance checks.
Record actual results and deployed revision afterwards. Production is unchanged.

## Preparation evidence

The initial integration workflow run 41352807867 failed the formatting gate for
`tsconfig.e2e.json`. Its production build and Chromium script job passed. The
first remote quality rerun then correctly required adopting the modified public
overview spec into E2E type coverage. Format that spec and adopt it; do not alter
the immutable deferred baseline or weaken assertions. The corrected E2E type
check passes (112 checked, 175 deferred). Complete combined suites are rerunning;
this entry does not declare them passed in advance.

Dev root headroom was approximately 669 MiB after the initial Nix evaluation.
With no Nix CLI active, relocate `/root/.cache/nix` to
`/data/cache-relocations/nix-root-20261101-public-preview` and retain the original
path as a symlink. Verify all 625 entries and 417775643 bytes, including SHA256
content, before deleting the redundant source copy and verify again through the
symlink. Root headroom increases to approximately 1065 MiB. Receipt:
`/data/webui-public-sidebar-preview-20261101/cache-relocation.json`.
No GC, store-liveness bypass, VM/session data deletion or unrelated service
changes were performed. Build temporary files and caches stay on `/data`.

## Verified candidate and activation

Deployed source: `4dec43bb9b6451df81053a1768d1190b7d67c916`, a clean preview
branch above the approved running basis. Integration branch:
`dev/public-sidebar-dev-preview-20261101`. It combines the selected feature
deltas without merging any feature PR or adopting the newer main API client.

Remote Linux checks passed:

- `ci:quick`, including 112 checked E2E sources and the unchanged deferred baseline.
- 230 script tests, 58 BFF tests, 1937 unit tests across 309 files, production build.
- Clean paired Nix frontend/BFF plus provenance, source contents, package contents
  and module evaluation checks. Six selected outputs built/evaluated successfully.
- Compiled candidate browser acceptance: 81 public/sidebar/account/scope checks
  across Chromium, mobile Chrome and mobile WebKit; 14 first-touch checks across
  both mobile engines; four existing overview checks across Chromium/mobile Chrome.
  All 99 final cases passed with zero retries.
- All six GitHub checks at each exact PR123/124/125 head passed. Combined preview
  [CI run 41354158812](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41354158812)
  passed all three jobs at the deployed revision. The earlier formatting failure
  in run 41352807867 remains documented above.

The additional existing-overview run initially failed two low-IPv4 cases because
our served-build harness incorrectly copied the legacy test-only `publicStatus`
override into the strict BFF config response. Bootstrap correctly rejected the
extra field. Correct the isolated harness to emit the actual config schema;
retain the existing init-script override and all assertions. All four cases
then passed against the exact unchanged candidate. This was a harness defect,
not a product/config relaxation. Preserve both attempt logs.

Validate the staged configuration with existing systemd LoadCredential settings
and the actual service account; validate nginx and retain the old hashed assets.
Under `/run/lock/clankerdev-dev-deploy.lock`, recheck the old paired revision,
configuration hashes and unrelated service PIDs before activation. Switch both
release pointers and restart only `webui-next-bff`. No nginx config change or
reload, API restart, VM mutation, secret/session replacement or production action.

The live frontend and actual BFF process both match the clean deployed revision.
Health is `ok`; configuration hashes and the PIDs of `vpsadmin-api`,
`webui-next-bff-kra` and `vpsadmin-supervisor` remain unchanged. Exact paired rollback
is retained at the previous `70bd11d9` release. Root headroom after build/staging
is approximately 844 MiB; the remaining host-capacity constraint is not resolved.

## Post-deployment evidence

Auth endpoint smoke passes on `https://dev.crucio.cz`. Real anonymous Chromium,
mobile Chrome and mobile WebKit checks pass for revision, dev-only API origin,
About/deep routes, theme persistence, one-tap menu/language controls, denied admin
access, JavaScript MIME types and absence of page errors/horizontal overflow.
Public captures use live anonymous dev data; authenticated screenshots use
synthetic fixtures. These checks do not certify a real two-account API audit.

Post-deployment fixture acceptance on the actual dev HTTPS origin passed all
81 public/sidebar/account/scope checks plus 14 first-touch cases: 95/95, zero
retries, across Chromium, mobile Chrome and mobile WebKit. Authenticated roles
use synthetic sessions and intercepted APIs, not real member credentials.

An additional settled-page live anonymous check waited for deferred sections to
finish. All five real public API reads (statistics, node status, outages, news,
published advisories) returned HTTP 200 in each browser. Screenshots were
refreshed after loading completed; loading placeholders are not used as proof.
The isolated candidate nginx listener is stopped after successful acceptance.
The deployed source remains `4dec43bb`; this documentation-only receipt does not
require rebuilding or switching the release.

Sanitized test logs/captures are under
`/data/webui-browser-runner/evidence/public-sidebar-preview-20261101`.
Private paired deployment/configuration/CI/scope receipts are under
`/data/webui-public-sidebar-preview-20261101/private` (not committed).
No release screenshots or reports were added to the configuration repository.
