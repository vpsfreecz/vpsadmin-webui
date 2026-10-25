# Network address and interface details — 2026-10-25

Status: prepared for independent review on `dev/network-details-feedback`.
Not merged or deployed. Transactions remain separate and unreviewed.

## Request and implementation

[Discourse post 7](https://discourse.vpsfree.cz/t/372/7) reports missing member IP
interfaces and ownership, and missing MAC addresses in the VPS interface list.
REQ-050 and the workflow contract now cover these facts.

- Read-only inspection of HaveAPI's serializer and the assignment Index found
  that nested includes alone are insufficient for some API versions. Unresolved
  assignment references are hydrated using current allocation lists, once per
  affected scoped VPS, four reads at a time. Foreign VPSes are not queried and
  stale assignment IDs are not retained. Existing 250-record list limits remain.
- Active assignment expansions explicitly request the allocation, network,
  interface, including intermediate relations. Ownership uses the allocation owner
  ID already present in the resource reference; full owner profiles are not
  requested by the new hydration path. The member
  assignment's user is never substituted for allocation ownership.
- Interface display accepts expanded names and resource labels, with an ID
  fallback; no interface is inferred for detached/routed allocations.
- Owned shows Yes only for the current member, No for explicit null ownership,
  and a dash if the API omitted/redacted that fact.
- VPS interfaces show `mac` on desktop and mobile; no MAC editing was introduced.
- Extracted the coherent address model, view and tab button from the inherited
  large page. The page is below 500 lines and its exact-hash structural debt
  exception was removed, without changing the historical baseline.
- Existing address assignment, filter, tab/focus and scope behavior is preserved.

No API, service, consent, deployment or production-data changes are part of this
candidate. Source inspection used the existing API `IpAddress`,
`IpAddressAssignment` and `NetworkInterface` resource definitions. Czech/English
copy follows the terminology/localization guides from locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` (`vpsadminServices` lock node).
The existing legacy KB contracts are unchanged; external KB screenshots have not
been recaptured by this task.

## Verification

Completed local command receipts follow below. The new browser specification uses only
synthetic allocations and VPSes, covering member and privileged My view, allocated
versus assigned ownership, interface expansion, missing MAC, and narrow layouts.
Browser fixture results do not certify a deployed API or live permissions.

## Final local checks

Toolchain: Node 24.21.0 / npm 11.19.0 matching the repository pin; root and
BFF dependencies installed with `npm ci`. No active Git hook framework or
non-sample hook files were declared. Actual worktree author/committer identities
were checked before committing.

- `npm run ci:quick`: passed, including strict adoption of the new browser spec
  (72 checked, 196 deferred), type checks, localization/structure audits and
  documentation audits. Inventory regenerated where adapter types changed.
- `npm test`: 1876 tests in 302 files passed.
- `npm run test:scripts`: 226 passed; `npm run test:bff`: 57 passed.
- `npm run build`: passed; existing large-chunk warning remains.
- Targeted Playwright: 14 successful browser checks across desktop Chrome,
  mobile Chrome and the explicitly selected mobile WebKit scenarios.

Early development runs identified fixture/setup errors, not a final green suite:
the initial script run lacked BFF `cookie-signature` before BFF `npm ci`; browser
fixtures/strict coverage declarations were corrected before the final runs.
No full PR/nightly browser suite or live dev mutation/permission audit is claimed.
No new preview was deployed to dev.crucio.cz. The shared dev host's previously
reported disk-space blocker was respected; no large Nix rebuild or cleanup ran.

Root production dependency audit: zero findings. Main's unchanged BFF dependency
baseline still reports the high body-parser advisory GHSA-27r3-jxmh-p828.
The separately prepared `dev/bff-body-parser-patch` (`6ebe859e`) addresses it;
that security review is deliberately not folded into this feature branch.
These results do not mean every remote CI/release gate is green.

## Review publication

GitHub CLI authentication still returns HTTP 401. Safari fallback did not become
usable (app selection timed out). No PR or remote PR CI can be claimed. The
branch and prepared PR description are retained for publication after access is
restored. Main was checked again as `5a2d2bdc3ad7a827038f877d75959916528db844`.
Merge/deployment remain subject to the maintainer's explicit decision.

## Implemented UI captures

Synthetic fixtures only; no real member data, credentials or consent changes.

[Desktop IP facts](screenshots/2026-10-25-network-details/desktop-member-ip-facts.png)

[Mobile IP facts](screenshots/2026-10-25-network-details/mobile-member-ip-facts.png)

[Desktop MAC](screenshots/2026-10-25-network-details/desktop-vps-interface-mac.png)

[Mobile MAC](screenshots/2026-10-25-network-details/mobile-vps-interface-mac.png)
