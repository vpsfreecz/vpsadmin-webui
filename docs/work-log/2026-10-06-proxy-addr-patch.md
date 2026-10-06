# BFF proxy-addr patch (2026-10-06)

The BFF production dependency audit failed for proxy-addr 2.0.7 in
[CI run 37486610216](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37486610216).
The same version was already locked at the main baseline
`02ac0c7de1a588dbb14a18e652fe3f7e9b45cc51`.
[GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)
describes trust-subnet misclassification and identifies 2.0.8 as the patched
version. This record does not assess deployed exploitability.

The targeted npm update selects proxy-addr 2.0.8 in the BFF lock. It also adds
the package's verified funding metadata and reorders existing dependency keys
in the BFF lock's root package entry. All other dependency versions and
constraints are preserved. The BFF manifest and frontend lock are unchanged.
The BFF package uses the separately generated dependency hash
`sha256-m6CayVcO1z+Xuy+XlAEqVLoRFRACSNjdcn4pae1T+Dc=`. The existing loopback
trust configuration and runtime code are unchanged. [REQ-068 and
REQ-064](../design/REQUIREMENTS.md) cover package integrity and this dated record.

## Verification

The generator and fresh root/BFF installs passed in the locked Nix shell on
Node 24.21.0 and npm 11.19.0. Express resolves the installed proxy-addr 2.0.8.
Both production audits reported zero vulnerabilities:

```sh
# Repository root
npm audit --omit=dev --audit-level=critical --json
# bff/
npm audit --omit=dev --audit-level=high --json
```

The generated lock guard passed. Independent prefetches produced the new BFF
hash and reproduced the existing frontend hash. The root install reported that
the esbuild 0.27.2 install script was not covered by `allowScripts`. No blanket
script approval was added.

Focused verification passed 57 BFF tests, 14 package and proxy-response policy
tests, and 43 runtime-bootstrap/OAuth unit tests across three files. The full
ci:quick gate passed, including quality and all four type-check domains. The
documentation audit checked 68 documents and 70 requirement IDs. Scoped Nix
formatting and the exact dependency/hash guards also passed.

At this checkpoint, Nix package builds and clean committed provenance checks
remain pending. Their final revision and receipts are recorded in the
[session portal](https://vpsfree-cz.workspace.aitherdev.int.vpsfree.cz/2026-10-05-network-ipv4-left-counter/).
The patch is prepared for a separate PR and is unmerged and undeployed.
