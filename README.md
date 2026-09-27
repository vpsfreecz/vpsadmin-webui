# vpsAdmin WebUI

React frontend and Node OAuth BFF for the new vpsAdmin interface. This
repository preserves the history of `Kerrycek/clankerdev`; current development
is owned by `vpsfreecz/vpsadmin-webui`.

The planned first deployment serves `newadmin.vpsfree.cz` from one NixOS VPS.
It runs alongside the existing PHP interface at `vpsadmin.vpsfree.cz`.
Deployment and default-interface cutover are separate decisions.

## Design and requirements

Start with the [design handbook](docs/design/README.md) for requirements, UX,
architecture, API contracts, decision history, verification and handover.
The [requirements register](docs/design/REQUIREMENTS.md) tracks current intent,
status and acceptance. The [work log](WORK_LOG.md) records what changed and why.

## Development

Use the locked flake for the Node 24 development environment. The flake also
pins the vpsAdmin source used for API and Czech terminology review. Its
`packages` and NixOS module outputs will be added with the packaging work;
`nix develop` is the defined output in this revision.

```bash
nix develop
npm ci
npm run env:check
npm run dev
```

For localization work, follow [the locked-input procedure](docs/agent-instructions/localization.md)
and record the vpsAdmin revision it resolves. The `.nvmrc` and `.node-version`
files select Node 24 for developers who use those tools; the flake lock selects
the exact Nix toolchain.

## E2E smoke tests

```bash
# one-time browser install
npm run e2e:install

# same Playwright smoke set used for pull-request feedback
npm run e2e:pr
```

The default Playwright suite uses deterministic HaveAPI mocks and does not
require real login credentials. Fixture tests do not establish deployed API
compatibility.

## Docs map

- [WORK_LOG.md](WORK_LOG.md): ongoing work, decisions, verification and release record

- [SPEC.md](SPEC.md): specification entry point
- [docs/CANONICAL_DOCS.md](docs/CANONICAL_DOCS.md): current and historical documentation map
- `docs/README.md`: docs tree rules
- `docs/spec/README.md`: historical spec fragments
- `bff/README.md`: OAuth BFF details
- `deploy/`: historical Clankerdev deployment notes; they are not the new VPS runbook
