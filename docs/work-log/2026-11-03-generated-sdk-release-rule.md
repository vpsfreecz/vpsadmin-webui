# Generated TypeScript SDK release prerequisite

## Request and scope

Record the maintainer's requirement that a WebUI change needing new generated
API support must consume a published `vpsadmin-typescript-client` release before
merge. Related requirements: REQ-060 and REQ-068 in the
[requirements register](../design/REQUIREMENTS.md).

The contributor rule and [SDK dependency contract](../design/HAVEAPI_CLIENT.md#generated-vpsadmin-typescript-sdk)
distinguish the generated SDK from the HaveAPI transport, allow development
dependencies, and require final registry manifest/lock/provenance without
temporary overrides. They link vpsAdmin's canonical synchronization procedure
and retain separate backend-capability and integration/deployment approvals.
TypeScript releases default to the next minor unless the user specifies otherwise.

## Verification and status

Documentation and instructions only: no application, dependency, runtime,
workflow or version changes. Local link/anchor and whitespace checks and
`npm run audit:design-docs` passed. Independent review and integration follow
the maintainer workflow. These checks do not establish automatic enforcement
of the SDK release rule or live backend compatibility. The separate
generated-client adoption work remains user-owned.
