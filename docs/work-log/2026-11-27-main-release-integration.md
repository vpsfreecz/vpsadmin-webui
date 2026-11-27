# Approved release integration with main — 2026-11-27

The maintainer explicitly requested preparing existing PR336 against current main
and merging the qualified result. The selected release retains all93 previously
accepted PR heads, the four logical fixes310/311/330/332 and their authors. It now
also preserves current main's administrator backup cleanup37a2ff84 and published
SDK adoption ed4e67a9. Held258/306/316/323/324 remain excluded. An ordinary merge
preserves both histories; no rebase, squash or forced branch update is used.

## Reconciliation

The product, tests, catalogs, SDK0.7.0 registry lock and importNpmLock packaging
merge without code conflicts. Resolve the three documentation conflicts by
retaining every approved requirement/workflow addition and inserting main's exact
backup-cleanup acceptance, workflow and work-log additions. Preserve the generated
SDK, HaveAPI0.32.0, current capability gates, nondestructive plan removal, safe
cleanup defaults and unknown-outcome locks. No backend or database changes.

The locked terminology source remains
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; its Czech guide and localization procedure
were reviewed. Catalog changes are current main's existing additions. Their
original ownership and wording are retained; both language audits remain required.

## Builder-free release workflow

The maintainer requires assembling on dev.crucio.cz, with growing state under
/data, and the normal separate configuration-repository/confctl workflow. The
prohibited builder must never be contacted, including through Nix remote builders,
SSH aliases/jumps, hooks or delegated tools. The earlier personal-on-builder guide
is superseded for build location. This is not permission to change API or secrets.

Use a checked local Nix store/toolchain and disable all remote builders and
build hooks before entering/evaluating/building the configuration. Retain paired
frontend/BFF provenance and select the exact merged/qualified source pin using
confctl inputs channel set. Keep the configuration bump separate, inspect its
scope, retain the actual known-good generation and preserve live session state,
credentials and the API pin. Transfer the built closure and activate only the
selected WebUI VPS through an inspected direct SSH route. Use dry activation and
auto rollback, verify the actual running release and publish the configuration
pin. A source merge is not production activation; route/permission, configuration,
generation and real operator acceptance need their own recorded evidence.

## Verification boundary

Prepared locally. Complete exact-source quick/script/BFF/unit/build checks,
published SDK provenance, matching local Nix outputs and affected desktop/mobile
browser scenarios are required before pushing. Retarget existingPR336 to main
and follow all checks on the exact resulting head, retaining original failed
logs and inspecting successful logs for retries/flakes. Verify the actual
synthetic merge tree and current base/head immediately before merging. Earlier
SDK0.6 candidate checks are historical evidence, not qualification of this result.
Record actual CI/merge/deployment outcomes separately; do not anticipate success.
