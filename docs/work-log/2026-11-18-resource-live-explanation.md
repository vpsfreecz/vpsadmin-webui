# Explain resource changes without a restart — 2026-11-18

REQ-017 / RES-03. The maintainer explicitly requested finishing the revised
wording after the whole-forum audit. Member and administrator views now use
the same plain explanation that CPU, memory and swap are applied live without
restarting the VPS. The administrator text also preserves separate performance
and disk saves. Remove only the duplicate live badge on the performance card;
review metadata, risk classification, payloads, gates and tracking are unchanged.

Terminology: locked vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff;
both locked localization documents reviewed. The external KB contract pins
legacy PHP/API and has no React source input; no KB freshness claim is made.

Source prepared; exact focused quick checks, relevant tests, clean immutable
package, original required CI, paired preview and actual-dev readback remain
separate gates. Browser fixtures do not certify live API permissions or timing.
