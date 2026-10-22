# 2026-10-23 — Member administration release

Status: PRs #81–#85 merged through integration PR #86 and deployed on all three
sites on 2026-10-23 (Europe/Prague).

The maintainer authorized merging and deploying only our PRs #81–#85 once
PR #81 CI passes. Targets are newadmin.vpsfree.cz, clankerdev.vpsfree.cz and
dev.crucio.cz. API PR #44 and other contributors' pending PRs are excluded.
The application release contains no API source or dependency change. The separate
dev-only operational repair described below completed missing initialization
from the earlier authorized API upgrade; production API data was not changed.

The release preserves the original commits and integrates:

- #81: one calendar month from now when selecting member soft_delete, with
  month-end clamping and manual override before confirmation.
- #82: exact legacy named privilege levels and unknown-level preservation.
- #83: full-width wrapped transaction payload readers and original-value copy.
- #84: administrator password dialog, cryptographic generation, explicit copy,
  next-login reset and optional session logout through the existing user API.
- #85: selected-member account/system communication contacts with prominent
  custom recipients and explicit primary-email fallback/error states.

Integration retains all locale keys, tests and documentation from each PR.
Shared strict E2E roots are combined; the existing structural-debt exception
tracks the actual smaller combined overview and reviewed source hash rather
than discarding any action. The CI count correction from #81/#82 is retained
once. No test or check is disabled.

## Verification

Every source PR passed its required checks before integration. Combined revision
`f7a8f10cbb94a5dbc160b4e7c9854245c7588d05` passed
[build/script CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/39864196035)
and [desktop/mobile browser CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/39864196134).
The first desktop attempt reached the 30-minute job limit without a failed
assertion. Rerunning only that job on the unchanged revision passed; both mobile
jobs also passed. No test, selection gate or assertion was removed.

- `npm run ci:quick`, 226 script tests, 57 BFF tests and 301 unit files with
  1,869 tests passed.
- 78 focused Playwright desktop/mobile Chromium cases passed from source and
  again against the immutable Nix frontend over HTTPS with synthetic BFF/API
  fixtures. An initial external preview harness lacked the required BFF/HTTPS
  setup; correcting that harness required no product workaround.
- Pinned Nix frontend/BFF builds, provenance, source/package contents and module
  evaluation passed, including site-specific package-content validation.
- Live dev acceptance used owned synthetic members and the actual dev API:
  named role persistence and unknown-level preservation; soft-delete suggestion
  and manual override without deleting an account; primary/custom communication
  contacts and Email navigation; secure 10-character password generation, copy,
  save, required next-login reset and revocation of an existing member session;
  readable transaction input. The real OAuth login/reset flow completed through
  the profile page. Mobile iPhone WebKit covered contacts, password generation,
  role editing and horizontal overflow.
- Owned test accounts were restored and relocked, sessions closed, and temporary
  credentials/auth states removed after acceptance.

The forced-password-reset test initially found that dev lacked the API's shipped
`user_password_changed` mail template. The deployed API remained at
`fb2f51222503a45f2e5a42af505f719e44279ed0`. A scoped `MailTemplates.install_defaults!`
import installed only that template and its English/Czech translations, preserving
existing templates. The full login/reset test then passed. Production template
availability and both translations were checked read-only with vpsfreectl.

## Deployment and publication

All three frontend and BFF runtimes report the same clean full revision
`f7a8f10cbb94a5dbc160b4e7c9854245c7588d05` (`f7a8f10cbb94`). Public sites retain
`https://api.vpsfree.cz`; dev retains `https://dev.crucio.cz`.

Newadmin was built and activated through confctl with dry activation, health
checks and automatic rollback enabled. All seven health checks passed. Its
active generation is
`/nix/store/iziph2f0ix2rgzdq4i627a17m5hyhvkx-nixos-system-vpsadmin-webui1-26.05.20261019.f3a73bc`.
The deploy checkout used the previously deployed configuration base plus the
selected WebUI input patch, retaining NixOS `f3a73bc` instead of activating the
unrelated newer system pin already on configuration master.

Dev and clankerdev used staged matching frontend/BFF artifacts and paired pointer
promotion with retained rollback. The previous paired release
`1092ea48d20e49e31fd3ef2fa82880f769d302d1` remains available through the host's
generation/private receipt. Existing credentials and live session stores were
preserved; no npm installation was performed in a live release.

The single generated input-only configuration commit
[`fb68c293`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/fb68c293ef8f4223973e2ff60014a63026916619)
was published to master after successful activation and verification. It changes
only the WebUI lock entry and preserves other configuration inputs. No release
report, screenshot or browser output was committed to that repository.

All three sites passed anonymous auth endpoint smoke checks and nine public
Playwright cases: desktop Chromium, mobile Chromium and mobile WebKit per site.
These verified exact revision, API separation, About navigation, visible revision,
no horizontal overflow and no JavaScript exceptions. Newadmin nginx/BFF services
and older-host nginx/BFF services are active; process/package metadata matches the
frontend. Newadmin CSP retains console/heatmap frame origins and the payment QR
image origin. TLS validation was bypassed only for dev's existing certificate
problem, never for either public site.

Authenticated production login/recovery, frames and mutation workflows were not
repeated. Live member mutation acceptance above applies to owned dev accounts;
fixtures and anonymous public smoke do not certify every production API path.
The later documentation-only completion commit does not change the runtime pin.
