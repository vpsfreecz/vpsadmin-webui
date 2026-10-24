# Released HaveAPI client on current main

The reviewed dependency and adapter from `73070a17` and `2e32c814` are replayed
on main `40653dff`. The dependency stays at HaveAPI 0.31.2 with the same registry
integrity, transport lock and frontend dependency hash. The production adapter,
live credential lookup, bounded read recovery and uncertain-mutation safeguards
retain their reviewed behavior. No BFF implementation or product wording changes
are introduced. Requirements REQ-007, REQ-011, REQ-012, REQ-046, REQ-059 and
REQ-068 keep their existing contracts.

The requirements-table conflict keeps upstream's Tasks presentation and mobile
lookup behavior while adding the adapter contract links. The merged browser
type-coverage lists retain upstream's adopted cases and add public overview;
the obsolete adapter structural allowance is removed. The current synchronous
VPS lifetime-update and admin-preference tests use the actual-library XHR
fixture alongside upstream's unchanged blocking action-state assertions. Other upstream source and documentation are retained.

Verification uses a Gitless export of the exact tracked candidate source in the
locked Nix development environment. Retained checkout dependencies and private
files are preserved. Earlier release, browser and live evidence remains scoped
to its original source and inputs. New quick checks and final independent review
precede the full unit, build and affected Nix package checks; this entry does not
claim those later checks or a deployment.

The owned changes introduce no database migration, persisted format or wire
protocol. The migration-named adapter fixture concerns VPS migration actions.
Rollback uses matching prior frontend/BFF artifacts and retains BFF credentials
and session storage. The original published and live branches remain recovery
references; this refresh does not rewrite the older PR74 head or deploy a release.
