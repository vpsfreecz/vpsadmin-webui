# Readable user-data length errors

Approved UX-04 / REQ-010. A current clean preview fixture showed the 12px
user-data length count at 3.121:1 in dark mode in Chromium and mobile WebKit;
light mode was 6.470:1. The normal format-validation hints were already readable.

Use semantic foreground and medium weight for an over-limit count, with a
separate left border as the error marker. Preserve the 65536-character limit,
aria-invalid, the live status/accessible description, and disabled Save/Create.
Short content returns to the ordinary count style. No text or API change.

Extend the existing editor accessibility browser test with CS dark and EN light
contrast/marker/validity regression checks. Adopt the complete existing spec
into strict E2E TypeScript coverage; keep the frozen deferral baseline intact. Remote fixture evidence and the
finite personal-page audit live at
`/data/webui-browser-runner/verification-20261103/todo-profile-personal-five-audit-20261109`.
Its original156 cases retain source1a852fd6; the four targeted baseline probes
include2 actual dark-contrast failures. Do not relabel that evidence as this fix.

Prepared only. Source checks, exact PR CI, clean integration/Nix outputs and
paired preview acceptance must be recorded before claiming delivery. Both
broad UX tasks remain partial; fixtures do not certify live API permissions or
a physical weaker display. No production deployment or PR merge is authorized.

Validation before draft creation: pinned npm ci and all ci:quick gates pass
after adopting the existing spec and removing its unsupported old mock identity.
The frozen deferral baseline stays intact. Build passes. Four local focused-base
prototype cases pass in Chromium/mobile WebKit: dark11.747:1/light15.042:1,
medium500 weight and2px marker. Two original frames opened. These prototype
assets retain dirty13a provenance; they are not clean Nix/current preview proof.
Current1a baseline probes retain2 real darkfailures and2 lightpasses separately.
No new preview has been activated; exact CI and clean current-preserving
integration/packaging and paired acceptance remain required.
