# Operations and handover

This is the operational entry point for the canonical WebUI repository.
Requirements REQ-056–066 and REQ-068–069 apply. Follow the
[maintainer review/release workflow](../../AGENTS.md#maintainer-workflow-agreed-2026-09-30).
The [2026-10-16 release receipt](../work-log/2026-10-16-three-site-release.md)
records a completed deployment; it does not authorize another one.

## Repositories and environments

| Component | Role | Boundary |
| --- | --- | --- |
| vpsfreecz/vpsadmin-webui | Canonical React frontend, OAuth BFF, [Nix packages](PACKAGING.md), [service module](NIXOS_SERVICE.md), tests and this handbook. | Preserve imported history and use the approved exact source revision. |
| vpsfreecz/vpsfree-cz-configuration | Site input pin, host configuration and [newadmin runbook](https://github.com/vpsfreecz/vpsfree-cz-configuration/blob/master/docs/operations/newadmin-webui.md). | Read its AGENTS.md; use confctl for input changes and publish the deployed pin. |
| vpsfreecz/vpsadmin | HaveAPI and legacy PHP UI. | Separate backend work; no implicit API/database migration in a WebUI release. |
| vpsfreecz/vpsfree-kb-contracts | Navigation/page/capture contracts and isolated scenario runners. | Independent UI/API pins; KB publication separately approved. |
| newadmin.vpsfree.cz | One NixOS frontend/BFF instance; service API at api.vpsfree.cz. | Parallel interface; legacy vpsadmin.vpsfree.cz remains available. |
| clankerdev.vpsfree.cz | Older systemd/nginx frontend against api.vpsfree.cz. | Real users/data; scoped authorized release operations only. |
| dev.crucio.cz | Older systemd/nginx frontend using its separate test API. | Shared test machine; preserve other users' objects, services and configuration. |
| Owned isolated cluster | Synthetic live API/VM workflow certification. | Verify ownership/provenance; do not replace another initiative's VMs. |

All three WebUI origins received canonical source `718cf759` on 2026-09-30.
Read-only endpoint checks on 2026-10-02 still found that clean full revision,
healthy BFFs and the expected API separation. These dated observations are not
permanent current-version pointers. On 2026-10-03, all three received clean
release `f123a7fb`; its receipt records verification and retained rollback.
The [2026-10-28 dev preview receipt](../work-log/2026-10-28-dev-preview.md)
records PR97/PR98 on dev at clean `08154f07c9bd`, with production still at
`2d361c571eac`. Main and feature PRs remain unmerged. This is dev-review evidence,
not a production release approval. The [subsequent feedback refresh](../work-log/2026-10-28-dev-preview-feedback.md)
records both exact green PR heads on dev as clean `3f77b8f5720a`, with no
production update or main merge. The [mobile touch follow-up](../work-log/2026-10-28-mobile-touch-dev-preview.md)
adds PR99 on dev at clean `91ac3f64cb92` while preserving those two previews.
It records the maintainer's preference and isolated development-machine browser
runner for subsequent dev acceptance, with fixture versus live evidence separated.
The [completed three-site release](../work-log/2026-10-28-three-site-release.md)
promotes PR97/98/99 plus the synchronous maintenance-preference correction
PR101 to all three sites as clean `606a02c19f32`. It records exact-head CI,
369 served-bundle browser checks, real anonymous/auth/runtime evidence,
retained API/OS pins and one published WebUI-only configuration update.
Earlier preview-only states above are historical observations.
The [29 October audit-fix dev preview](../work-log/2026-10-29-audit-dev-preview.md)
records the separately authorized PR102/104–111 candidate; production promotion
and main merges remain outside that preview scope.
The [30 October network/DNS preview](../work-log/2026-10-30-network-dns-dev-preview.md)
adds PR113/114/116 on dev as clean `f1cd437d7cbd`, preserving the audit preview.
It records VPS-first assignment, continued primary-location suggestions, DNS
semantics and an actual DNS test blocked by the pre-existing offline DNS node;
production and main remain unchanged.
Check live state again before an update.

The [package guide](PACKAGING.md) defines output contents and provenance. Keep
frontend and BFF revisions paired. The [service guide](NIXOS_SERVICE.md) describes
the reusable module; importing it alone does not enable a site. Newadmin's actual
host, edge, credentials and monitoring are owned by the configuration repository.
The older hosts' provisioning scripts under `deploy/` are historical and must not
be used on newadmin or replayed over the credential-based older-host runtime.

## Newadmin release procedure

1. Establish the approved PRs/revision and target scope. By default include only
   our PRs from the maintainer's work with this assistant; other contributors'
   work needs explicit inclusion, even for "everything/latest" requests. Compare
   the candidate against the running revision and enumerate all newly included
   changes. Apply this boundary to both web and WebUI channel updates; verify
   the resolved pin and artifact, not just the PR list. If unapproved changes
   entered main, stop before deploying that candidate and resolve its scope.
   Do not remove already-deployed changes or rewrite shared history.
   Fetch current upstream;
   check exact CI heads and overlapping work. Build and test the selected
   candidate in the pinned WebUI `nix develop` environment. Record fixture versus
   real API evidence explicitly.
2. In a clean configuration checkout, read its current instructions and
   [site runbook](https://github.com/vpsfreecz/vpsfree-cz-configuration/blob/master/docs/operations/newadmin-webui.md).
   Inspect the active deployment, generation, frontend/BFF provenance, available
   build space and retained rollback generation. Keep existing session state and
   credential values. First-install checks are in the site runbook; an ordinary
   upgrade must not recreate state or provision a new OAuth client.
   Before generating the input commit, verify author and committer with
   `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT` in the exact
   configuration worktree and command environment. Use the current contributor's
   configured Git identity, not a fixed repository-wide identity. Preserve the
   original author when applying someone else's commit; the committer may differ.
   If identity is missing or inferred from a shared account, obtain the intended
   contributor identity before committing. On a shared root account, use
   task-scoped worktree configuration or explicit `GIT_AUTHOR_NAME`,
   `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME` and `GIT_COMMITTER_EMAIL` environment
   variables. Never set another operator's identity globally or infer it from
   root/hostname. Inspect the generated commit's author and committer before push.
3. Enter `nix develop` in the configuration repository. For an approved current
   main, the operator's update command is:

   ```sh
   confctl inputs channel update --commit vpsadmin-webui
   ```

   Confirm `nodes.vpsadminWebui.locked.rev` in `flake.lock` equals the full approved
   SHA before continuing. If main includes unapproved commits, use the runbook's
   `confctl inputs channel set --commit vpsadmin-webui vpsadmin-webui FULL_COMMIT`
   instead. Use one generated input commit per release; do not hand-edit the lock
   or deploy a local override. Preserve generated commit messages and run declared
   hooks; inspect changed custom hooks before signing them.
4. Build and dry-activate only the selected host:

   ```sh
   confctl build cz.vpsfree/vpsadmin/int.vpsadmin-webui1
   confctl deploy cz.vpsfree/vpsadmin/int.vpsadmin-webui1 dry-activate
   ```

   Verify the matching frontend/BFF package checks on the selected input. Review
   activation changes, including any site changes already present in the
   configuration checkout. A successful dry activation is not a runtime check.
5. With the authorized release ready and rollback recorded, activate it:

   ```sh
   confctl deploy --dry-activate-first --enable-auto-rollback cz.vpsfree/vpsadmin/int.vpsadmin-webui1 switch
   ```

   The build machine must have the usual verified SSH route/host identity and
   deployment access. These commands do not require exposing credentials or
   copying private keys into the repository. Keep confctl health checks enabled.
6. Check the active generation, `nginx` and `vpsadmin-webui-bff`, and the frontend
   full SHA from `/build-info.json`. Check BFF package metadata separately at
   `share/vpsadmin-webui-bff/build-info.json` under the package in the active unit's
   executable path. Both must match the approved clean revision.
7. Run [post-deployment checks](#post-deployment-checks), retain sanitized evidence
   and record results/limitations in a dated work-log entry. Push the corresponding
   configuration commit to its normal upstream after successful deployment;
   reconcile concurrent changes without force-pushing or downgrading another pin.
   A later documentation-only source commit does not require redeploying or
   changing the approved runtime pin.

For dev and clankerdev, use the
[older-host release and recovery guide](../operations/older-hosts.md).
Their current runtime is not managed by the newadmin confctl target.

## Post-deployment checks

Use the source-contained anonymous smoke check for each approved target:

```sh
bash deploy/smoke-auth-endpoints.sh https://newadmin.vpsfree.cz
bash deploy/smoke-auth-endpoints.sh https://clankerdev.vpsfree.cz
```

Dev's known certificate/SAN problem requires an explicitly dev-only exception:
`bash deploy/smoke-auth-endpoints.sh https://dev.crucio.cz --insecure`.
Do not disable TLS validation on the public sites.

Check `/config.json` schema and API origin, anonymous `/session.json` fields,
SPA deep links, hashed assets, desktop/mobile rendering and browser errors.
The session route expects same-origin request metadata; a bare cross-site probe
may correctly return 403. The smoke helper supplies the required headers and
prints only a summary, not OAuth redirect query values or session responses.

For newadmin, inspect the document CSP: console and heatmap origins belong in
`frame-src`, not the console in `connect-src`. The site runbook also requires a
controlled authenticated acceptance session for login/recovery, frames, locale
and important read-only API paths. Such acceptance remains outstanding for the
2026-09-30 deployment; anonymous checks and fixture E2E do not replace it. Real
mutation/lifecycle certification belongs in the owned isolated environment.

## Local development

Use a clean isolated worktree and preserve unrelated changes. Enter `nix develop`
for the locked Node 24 toolchain, run `npm ci` and `npm run dev`, then follow the
[verification commands](VERIFICATION.md). Use the local runtime config example in
[public](../../public/config.local.js.example). Keep private config out of commits.
Fixtures allow layout/browser work without real credentials. The OAuth BFF has its
own [environment/setup requirements](../../bff/README.md). The flake's pinned
`vpsadmin` input supplies the terminology and source API reference; the site
may override it, so record the effective revision for integration results.

## Rollback

Rollback trigger examples: broken authentication/session routing, wrong frontend
or BFF provenance, missing static assets, or a confirmed critical regression in the
approved scope. Preserve failure evidence and avoid replaying ambiguous mutations.

Restore the retained matching previous frontend/BFF release and webroot using the
host's validated backup mechanism, restart the BFF, validate nginx if configuration
was changed, then recheck provenance, health, auth and deep routes. Restore configs
only when needed; do not overwrite unrelated changes or secrets. Frontend rollback
does not undo API mutations or database migrations. A migration needs its own plan.

For the 2026-09-30 cutover, retained rollback source was `534caa83` on newadmin
(NixOS generation 4) and `156a7c04` on both older hosts. Follow the
[release receipt](../work-log/2026-09-30-three-site-release.md) and the target's
retained generation/private receipt; do not assume those are still the preceding
releases after a future deployment. Never restore stale refresh-token session
files. Reverting the application Git branch alone does not roll back a running
service or the configuration pin.

## Ownership and secure handover checklist

The following cannot be solved by publishing credentials in a repository:

- Name product acceptance, frontend/BFF operations, backend/API and KB owners.
- Transfer host access, OAuth client ownership, session secrets, certificates/DNS
  ownership and monitoring access through an approved private channel.
- Transfer retained release/rollback artifacts and scripts with hashes and an
  operator walkthrough; rehearse restoration in an owned environment.
- Transfer private evidence/receipt locations and review sanitized summaries for
  durable CI/repo storage. Never publish production screenshots or personal data.
- Confirm API version/capabilities and unresolved cursor/deletion policies.
- Keep the selected preview hostname; agree remaining KB publication and
  default-interface cutover policy explicitly.
- Arrange independent audit scope and track findings, severity, ownership and closure.
- Keep the scheduled autonomous-development automation paused until explicitly
  resumed. A direct UI/docs task does not resume it.

See the [beta gates](VERIFICATION.md) for outstanding certification. This handbook
provides a source-contained design handover; it does not claim private operational
access transfer, a full audit, or public-beta approval has happened.
