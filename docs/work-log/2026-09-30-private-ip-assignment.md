# 2026-09-30 — Private IPv4 availability on staging VPSes

## Request and cause

The maintainer reported that assigning a member a resource package succeeded,
but adding private IPv4 from VPS detail reported no available address on staging.
Legacy UI could assign it. Requirement: REQ-050.

Two frontend exclusions were found: exact `purpose=vps` omitted general-purpose
networks, and a second primary-location check discarded secondary-location API
results. The preselected-address VPS selector made the same primary-location
assumption. Backend cursor PR #44 is unrelated and remains excluded.

## Change

Request compatible purposes with `usable_for=vps` and trust the API's location
association filter. Revalidate cached detached/preselected addresses outside the
first page with the same constraints before offering them. Do not filter target
VPSes by primary network location. Block submission during availability refresh
or failure. Preserve the existing assignment action, quota enforcement, local
locks, action-state tracking and uncertain-result reconciliation.

## Evidence and status

Prepared on `dev/staging-private-ip`, based on WebUI
`534caa83a5f97d2b40b4a126886649b14dc9e8d3`. Not merged or deployed.
Verification and cleanup results follow.

### Automated checks

- Full unit suite: 1,634 tests in 280 files passed; 57 BFF tests passed.
- 33 targeted unit tests: `ipAddresses`, `IpAddressAssignmentModel`,
  `fetchAssignableIpAddresses`.
- `npm run ci:quick`, application typecheck and production build passed.
- Strict E2E typecheck and its 16 coverage-harness tests passed: both touched
  browser specs adopted (13 checked sources, 227 unchanged deferred sources).
- 28 fixture browser cases passed: 21 Chromium cases across private-IP
  availability, network actions and assignment failures; 3 private-IP cases on
  mobile Chrome; 4 member-network overview cases. These are mocked API tests.
- Script suite: 221 passed initially; the BFF queue test could not load its
  dependency in the scratch checkout. Linked the existing matching BFF dependency
  directory and reran that test successfully; no package or deployed service changed.
- Regenerated API/route inventory (no generated inventory change); documentation
  audit passed. No localization strings changed.

### Actual dev API/browser simulation

On 2026-09-30, tested the candidate through a loopback Vite preview while keeping
browser API requests on `dev.crucio.cz`. Only UI assets/config were redirected;
IP queries, package/VPS creation, assignments and action-state polling used the
real API. This was not a deployment of the candidate to the public dev site.
API pin: `486350466e8fb6f966add1cde3fa2bc12b4d6b62` (7.0).
Deployed UI used for the before comparison: `156a7c043e543b5f4a51fc962d16e31bd6eaa00f`.

Created synthetic administrator 24, member 25 with package assignment 28 in
non-production environment 11 (`playground-lab`), VPS 42 on node 103/location 11,
and interface 32. The existing location/environment explicitly represents the
playground/staging lab. Test credentials were seeded, not obtained through an
OAuth login flow; this test certifies assignment rather than authentication.

| Case | Before | Candidate / saved result |
| --- | --- | --- |
| Private network 116, purpose `any`, primary location 11 | Exact-purpose query omitted IP 84. | Member assigned `10.254.230.1/32`; action state 294 finished successfully (2/2). |
| Private network 117, purpose `vps`, primary location 10 plus association with location 11 | API returned IP 85, then the administrator UI discarded it by primary location. | Administrator assigned `10.254.231.1/32` to the member's VPS; action state 293 finished successfully (2/2). |
| Export-only network 118 | Not compatible with VPS allocation. | API excluded IP 86 from both role-scoped candidate lists. |
| Network 116 queried for unrelated location 2 | Not associated. | API returned no candidate. |

Independent API reads confirmed both assigned addresses on interface 32 and
charged to environment 11. Existing unrelated lab private addresses remained
available, so the before comparison proves exclusion of these valid candidates,
not that the entire lab selector was empty. The original production VPS/network
was not inspected; the exact cause of that individual incident is not claimed.

Screenshots use only synthetic accounts and objects:

- [Administrator, desktop EN](screenshots/private-ip-staging-admin.png)
- [Member, mobile CS](screenshots/private-ip-staging-member-mobile.png)

### Cleanup and limits

Detached both test addresses (chains 295/296, success 2/2); hard-deleted the
synthetic VPS (297, success 10/10), member (299, success 4/4), and administrator
(300, success 3/3). Final readback confirmed hard-delete states, no remaining test
networks/IPs/namespace/map, and zero active or token-bearing test sessions. Audit
rows are retained. Stopped only the preview started for this test.

Member cleanup exposed a separate dev-seed limitation: an object resource had
no `free_chain`, leaving one zero-valued `EnvironmentUserConfig` resource-use row.
Removed only that synthetic member's guarded zero-valued row before retrying
normal deletion. Shared resource configuration was unchanged. This is not a
certification of the general account-deletion workflow.

Machine-readable assignment/cleanup receipts and test logs remain under
`/data/webui-private-ip-20260930` on the dev host, with a local handoff evidence
copy. No secrets are committed. The selector still uses its existing 50-candidate
bound; this change does not certify exhaustive allocation-pool pagination or
other administrator inventory selectors. No new backend PR is required.

## Deployment follow-up (recorded 2026-10-02)

[PR #6](https://github.com/vpsfreecz/vpsadmin-webui/pull/6) was merged
on 2026-09-30 and deployed in `718cf7596eb8b11a796268a73c1f2e0a02a98450`
to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. See the
[release receipt](2026-09-30-three-site-release.md) for exact CI and deployment
evidence. The earlier prepared status is historical; fixture checks are still
distinct from authenticated live workflow certification.
