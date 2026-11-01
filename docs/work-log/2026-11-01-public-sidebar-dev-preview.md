# Dev preview: public preferences, overview and authenticated navigation

Status: prepared, not yet deployed. Target: dev.crucio.cz only.
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
