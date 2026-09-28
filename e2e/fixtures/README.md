# Fixtures

Fixtures should represent a **minimal subset** of HaveAPI responses used by e2e tests.

Rules:
- keep fixtures small
- prefer fixed timestamps
- include only fields the UI reads
- document scenarios (user-advanced, user-basic, admin-mine, admin-all, locks-vps)

The authoritative structure is defined in:
- `docs/spec/E2E_TEST_PLAN.md`

## Fixture router helper

Most specs should use the shared helpers:
- `bootstrapVpsAdminWindow(page, ...)` (sets `window.vpsAdmin` runtime config)
- `installHaveApiMock(page, ...)` (routes HaveAPI calls to deterministic handlers)

This keeps specs short and ensures we stay consistent with the runtime bootstrap.

The router supports `installHaveApiMock(page, options)` and
`installHaveApiMock({ page, ...options })`. The object form also installs the
standalone window bootstrap. `user` is a complete user seed; the older
`authorize.user` and `authorizeUser.user` fields are partial overrides applied
before `user`. Handlers receive `request.postData()` and
`request.postDataJSON()` on every routed action. Parsed JSON is `unknown` until
the handler checks its shape. Query parameters are copied into `params`, then
object body fields overwrite matching keys. The raw query remains available
through `searchParams`.

`ctx.body` does not exist, and `authorize.identity` is not consumed by this
router. Specs using those fields must correct their scenario contract when they
enter strict checking. Malformed JSON still rejects before a handler runs.

The required `typecheck:e2e:core` command checks these shared helpers and two
named smoke specs. Its [coverage inventory](../../scripts/fixtures/e2e-type-coverage.json)
records all other existing specs by exact source hash. An edited deferred spec
or a new spec must be adopted with zero diagnostics; the separate
`typecheck:e2e:all:diagnostic` command intentionally remains failing until the
whole suite is adopted. These are synthetic fixtures, not proof of backend
permissions or deployed behavior.
