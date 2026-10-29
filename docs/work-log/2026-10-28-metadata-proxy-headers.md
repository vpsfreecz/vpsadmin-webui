# Runtime metadata proxy header ownership — 2026-10-28

Status: prepared review candidate; not merged, deployed or applied to a host.
REQ-059/REQ-068/REQ-064. No API, credential, cookie or module option changes.

## Finding

Anonymous read-only wire checks found duplicate CORP/cache/nosniff fields on
session.json at dev and clankerdev, and duplicate nosniff on newadmin. The BFF
sets metadata protections and nginx adds another copy. Duplicate CORP values
combine into an unrecognized policy, losing that defense under the normal
embedder policy, as described by the [Fetch standard](https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header).
This conclusion does not automatically apply to nosniff's different parsing.
No disclosure was observed; the independent BFF same-origin request guard
continues to reject cross-site session access with403.

## Change

Nix metadata locations suppress only the upstream nosniff copy, retaining the
existing nginx nosniff policy and BFF cache/CORP/Vary fields. Legacy metadata
blocks suppress exactly the three upstream fields nginx explicitly replaces:
Cache-Control, Cross-Origin-Resource-Policy and X-Content-Type-Options. Their
existing explicit policies are retained once. CSP, Vary, Set-Cookie and the
OAuth/passkey policies are untouched. Direct BFF responses retain protections.

Strengthen metadata parity validation from CORP presence to one exact
same-origin value, with a real duplicate-header server regression. Update its
stale anonymous session contract to the current accessToken/sessionExpiresAt/
sessionKey shape and redact/reject a non-null anonymous session identity.
Nix VM assertions now check header multiplicity instead of reading only the
last duplicate value. No existing assertion is relaxed.

## Verification and rollout boundary

A real isolated nginx instance on an ephemeral loopback port loaded the exact
legacy metadata blocks before/after. Anonymous live BFF responses changed from
two CORP/nosniff/cache fields to one reviewed value; session nulls and Vary were
preserved. The test's nginx process was stopped; the global nginx and public
site configuration were untouched. Nix module evaluation passed after nixfmt.
All228 script checks and the complete ci:quick gate passed. The full NixOS VM scenario is extended
but has not been rerun here; evaluation is not live proxy/VM proof.

Apply only as part of an explicitly approved release. The Nix module updates
newadmin through the configuration repository's usual deployment. Effective
legacy host configs have additional current routes, including config.json,
that some historical templates lack. Apply the same three hide directives only
where the effective metadata location explicitly re-adds those fields. Preserve
its current API forwarding, CSP nonce and OAuth customizations; do not regenerate
a whole live config from an older template. Verify anonymous and authenticated
metadata, same-origin rejection and one CORP value after the approved rollout.
The parity helper retains its historical same-origin API deployment assumption;
it is not a generic newadmin cross-origin API certification tool.
