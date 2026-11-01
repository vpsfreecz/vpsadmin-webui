# Development dependency security patches — 2026-10-28

Status: prepared review candidate, not merged or deployed. REQ-068/REQ-064.
The online baseline production audits for frontend and BFF each report zero
known vulnerabilities. The full development tree reported seven affected
packages. This is a development/build-tool finding, not production BFF RCE.

Update Vite 7.3.5 to 7.3.7 and Vitest with its matching @vitest family from
4.1.11 to 4.1.12. Refresh source-map-js 1.2.1 to 1.2.2 and zod 4.6.5 to
4.6.7 through existing compatible constraints. Vitest's compatible dependency
resolution also advances chai 6.2.2 to 6.3.0 and tinyrainbow 3.1.1 to 3.2.0.
No production dependency, BFF dependency, Node runtime or flake input changes.

Typography 0.5.19 pins postcss-selector-parser 6.0.10 exactly. Apply a scoped
override of that dependency to patched 6.1.5 in the same major version.
Do not accept npm audit's suggested typography downgrade to 0.5.4. Remove the
override once upstream permits a patched parser and verify the resolved tree.

Advisories include [Vite filesystem allowlist](https://github.com/advisories/GHSA-rq7h-c2jc-7f22),
[Vitest mock registration](https://github.com/advisories/GHSA-qxg6-89mg-rqv8),
[source-map indexed sections](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
[selector parser complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
and [Zod collection allocation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
Some additional findings are Windows/dev-server-specific; that narrows exposure
but does not justify leaving the known vulnerable versions in the lockfile.

## Verification

Compatible patches and the narrow override resolve all seven findings: the
current online full-tree audit reports zero known vulnerabilities. Fresh Linux root/BFF installs, ci:quick, all 226 script checks, all 1899
unit tests (two workers) and the production build passed. Browser and real Nix
package verification remain separate gates on the committed candidate.
Prefetch ran on the isolated dev checkout and produced frontend npmDepsHash
`sha256-28vGrgPG/XPHNUAaTn6q5RxC2bcVW1yIAj7OYnKuJik=`. BFF hash is unchanged.
Bundled WASI dependencies produce the known prefetch warning; a real Linux Nix
package build, not a hash alone, is required before packaging is claimed green.
