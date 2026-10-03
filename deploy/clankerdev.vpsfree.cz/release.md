# Clankerdev release and recovery entry point

Legacy PR530 supplied an executable promotion/rollback guide for release 156a7c04.
The 2026-09-30 canonical migration changed credentials and both live-pointer
layouts. Replaying its environment-secret or in-place webroot commands would
replace the current runtime incorrectly. The source-preserved historical guide
is available in [legacy PR530](https://github.com/Kerrycek/clankerdev/blob/e0f99d8f733025b18c5fa7283871d57edc7c7c85/deploy/clankerdev.vpsfree.cz/release.md).

Use the current [older-host release and recovery guide](../../docs/operations/older-hosts.md)
and [operations entry point](../../docs/design/OPERATIONS.md). These cover paired
frontend/BFF artifacts, systemd credentials, immutable release staging, retained
assets, deployment locking, provenance, post-release checks and rollback.
Newadmin uses the separate configuration repository and confctl, not this host.

Retain the original guide's guard against stale recovery: capture the expected
previous release and candidate in the private receipt, acquire the target's
release lock and recheck the actual pointer immediately before restoration.
Only the receipt's candidate or its already-restored previous pair is eligible.
An unrelated or missing active pointer stops recovery; do not overwrite a newer
release. Verify configuration drift separately and never restore stale session
files. A shared commit SHA alone does not prove that an intervening deployment
belongs to the same operation.

No deployment commands were executed for this port. Operator rehearsal and
private receipt/access transfer remain handover tasks. See the
[adaptation record](../../docs/work-log/2026-10-03-documentation-port.md).
