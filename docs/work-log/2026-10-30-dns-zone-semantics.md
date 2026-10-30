# DNS zone semantics and wildcard owners — 2026-10-30

REQ-049. The maintainer approves implementing the proposal for
[Discourse post 9](https://discourse.vpsfree.cz/t/372/9), then deploying the DNS
change with our IP follow-ups PR113/114 to dev only. No shared-main merge,
production promotion, backend change or unrelated PR is included.

Prepared on `dev/dns-zone-semantics` above dev preview PR112 (`455ea11f`),
retaining its patched toolchain and already authorized runtime behavior.

## Contracts and implementation

- Zone kind (primary/secondary) comes from API source, independently of forward/
  reverse direction. Show both in desktop/mobile lists and detail; use the same
  primary/secondary terms as creation. Preserve source/role API tokens, URL filter
  syntax and authorization. Unknown source is not asserted to be primary.
- Replace Czech forwarding wording with the locked guide's `Dopředná`. Add a
  collapsed explanatory disclosure without changing server-stored help boxes.
- Only positively identified primary zones expose local DNSSEC state/controls.
  Secondary/unknown flags do not establish signing status. Omit DNSSEC from
  secondary settings writes, and prevent direct secondary DNSSEC URLs from
  querying local key records. Keep primary controls and payload unchanged.
- Accept the exact wildcard owner `*`, already accepted by the API. Keep existing
  `*.sub` handling, target-name validation, TTL/content/conflict rules and exact
  submitted owner names. Extract cohesive name rules rather than refreshing a
  frozen long-file hash; retire its satisfied structural exception.

Terminology reviewed at the flake-locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Local backend inspection is contract
evidence only, not an authorization to edit/deploy the backend.

## Verification and status

Both the first and strengthened final browser runs passed 36/36 checks
(cs/en, member/admin, desktop Chromium, mobile Chrome and mobile WebKit). `ci:quick`, production build and 40 DNS unit tests passed on the
development machine. The first E2E type check identified a runtime-import graph
introduced only by the fixture's type imports; using local fixture shapes keeps
that project independent without weakening type checks. Original diagnostic
logs are retained. Evidence is under
`/data/webui-browser-runner/evidence/dns-semantics-20261030`. All Playwright
processes run on the development machine in the isolated pinned runner, never
the maintainer's Mac. Synthetic browser responses verify UI behavior; they do
not prove live DNS publication or cross-member API permissions. No production
DNS data is used in screenshots or modified by this change.

PR113 and PR114 each have six green exact-head GitHub checks before preparation.
A separate combined preview will retain original feature histories and record
its exact runtime SHA, rollback, checks and actual deployment outcome. Do not
infer that this prepared DNS branch is already deployed.

## External documentation impact

Read the canonical KB workflow in the available `vpsfree-kb-contracts` checkout.
Its DNS navigation contracts bind legacy `webui/forms/dns.forms.php` and the
primary/secondary KB pages; those source fingerprints and API revision are
unchanged here. That repository's optional React capture input still targets
the separate historical Clankerdev repository, not this canonical feature.
Do not replace its vpsAdmin input with a WebUI SHA or claim regenerated KB
captures. This PR supplies current cs/en React captures and documents the
remaining independent canonical-React capture migration. No wiki publication.

Standards references for the presentation review:
[RFC4592 wildcard owner terminology](https://www.rfc-editor.org/rfc/rfc4592.html#section-2.1.1)
and [RFC4033 zone/name-server considerations](https://www.rfc-editor.org/rfc/rfc4033.html#section-8).
These do not change the existing API's supported name grammar or DNSSEC policy.

Implemented synthetic captures:
[desktop](images/2026-10-30-dns-zone-semantics/desktop-cs.png),
[mobile WebKit](images/2026-10-30-dns-zone-semantics/mobile-webkit-cs.png).
