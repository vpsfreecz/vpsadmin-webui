# Keep complete host-address text inside the dialog

Status: prepared; no merge or deployment is claimed.

The approved UX-03/UX-04 finite network audit reproduced a 325 px document at
320 px after an intercepted rejection. The failed IPv6 address also escaped the
error border, and the route introduction was clipped by the dialog. The stronger
text-rectangle regression fails on the current clean preview in all eight local
language/theme/engine configurations, including the introduction when document
width alone did not reveal clipping.

The first local modal-only correction fixed those text rectangles, but four
Chromium cases still found the duplicate failure in the surrounding network card
pushing document width to325px. Preserve that intermediate negative. Add local
minimum-width and overflow-wrap handling to both the modal body and its network
action error panel. Keep the route, validation and partial-batch strings, native textarea,
address normalization, API requests and retry semantics unchanged. No shared
Alert, API, SDK, BFF, localization or dependency change is included.

The new browser regression checks every rendered text rectangle at 320 px,
rejected-address preservation, the exact intercepted POST body and the 1280 px
control case. It belongs to the strict E2E inventory without changing the
immutable deferred baseline or compiler flags. Browser fixtures do not establish
live authorization or host networking behavior.

Pinned quick/build, focused and cumulative browser checks, clean Nix outputs,
exact-head CI and paired delivery are still pending. Original negative traces
and practical limits remain in the durable task acceptance report.

The older focused13a base has a separate preexisting340px page overflow from
unrelated network layout. Preserve that negative instead of adding other feature
changes to this PR. The committed regression bounds the modal and every text
rectangle in both affected error surfaces; the cumulative private acceptance
probe retains the unchanged321px whole-document limit. Cancel clears the page
failure by the existing mutation reset, so the duplicate is measured while the
modal is open. An initial after-Cancel private probe was stopped and retained as
setup evidence, not a product failure.

## Local verification before the draft commit

Pinned Node24.21.0/npm11.19.0 quick checks, strict E2E inventory, build and final
design/active-documentation checks pass. Existing network model, parity, intent
and local-lock tests pass:30 in each focused source and33 in the cumulative
source. No compiler or deferred-baseline relaxation was used.

The focused regression passes8/8 local configurations in Chromium/mobile WebKit,
Czech/English and light/dark. The combined dirty preview passes16/16 regression
configurations; these are working-build results, not clean Nix or hosted CI.
Clean packaging, exact-head CI and paired publication remain pending.

The cumulative whole-document321px bound passes after both local text surfaces
are corrected. Preserve the initial modal-only12/16 result and the focused-base
340px unrelated-layout diagnostic. The source regression checks local modal
bounds and every text rectangle in both affected surfaces.

## Exact focused-base mobile Chromium follow-up

The original head49419da9 has four deterministic hosted mobile-Chromium
failures. Shortening only the synthetic hostname is not a repair: the
controlled counterfactual still fails all four mobile-Chromium cases, while
the unchanged target-text regression fails12/12 on clean previewdb4d721.
Keep the original full hostname, full IPv6 bytes, intercepted403, exact POST,
retained retry draft and every text/modal bound.

A settled-source Vite probe identifies two earlier IPv6 spans escaping the
interface and route cards at right323px and340px. They widen Chromium's layout
viewport from320px to340px before the modal opens. Add local breaking to those
two spans, using exactly the classes already present in the current cumulative
preview. This imports no header, shared-overlay, API, locale or feature change.
The new assertions also bound these complete route values and the whole
document before opening the dialog. The old hostname-only proposal was
explicitly rejected; all original negatives remain in the private evidence.

Pinned clean-parent build and private fixture typecheck pass. The working Vite
regression passes12/12 across desktop Chromium, mobile Chromium and mobile
WebKit, Czech/English and light/dark, without retries. The complete original
hostname and all original target assertions remain. Required checks, a new
exact-head CI gate and cumulative packaging/delivery remain pending at this
checkpoint. Browser
fixtures establish neither real API permissions nor physical Safari behavior.
