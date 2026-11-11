# Keep storage actions and resize validation readable

Status: prepared for review. No merge or preview delivery is claimed.
Requirements: REQ-010 and REQ-011; approved UX-03/UX-04 presentation scope.

## Problem and local changes

The finite storage audit found24 passes and8 failures in32 clean6d fixture
configurations. Selected administrators at768px had a874px document: the root
header actions required572.59px and extended to873.59px, squeezing the dataset
identity into a narrow column. Exact activeDF6 artifact probes reproduce it in
both Czech themes. Four dark cases also produced12 below-used-space validation
samples at3.121474:1/weight400.

Allow this root CardHeader to wrap and bound its immediate children. Reserve a
15rem identity basis when it becomes a row, so actions wrap before the identity
shrinks. The initial wrap/max-width trial removed768px overflow but failed the
unchanged200px identity minimum at1024px (117px Czech/165px English). Original
negatives remain; the final class preserves the bound across320/768/1024/1280.
The mobile column gets no vertical flex basis.

Give only the existing invalid SSD-size message normal foreground, medium weight
and a separate danger border. Keep numeric validation, native aria-invalid,
values, override, disabled submission and server-error handling unchanged.
Shared CardHeader, palette, API, SDK, BFF, capabilities, query keys and payloads
are unchanged. Remaining runtime diff is required formatting.

The older focused13a source keeps its existing body-action arrangement. The same
local header class is applied there without importing newer storage features.
Current header-negative evidence belongs to DF6/6d, not the older focused base.
The independent cumulative candidate starts at activeDF6 and excludes the two
unverified network commits. The earlier dirty6d working source stays preserved.

## Actual local verification and limits

Pinned Node24.21.0/npm11.19.0 with npm ci for root and BFF. Focused ci:quick passed
before the basis-only refinement; final format/design/active-doc checks and build
passed after it. The independent DF6 source passed full ci:quick and build after
the refinement. The new regression is explicitly selected for mobile WebKit and
strict E2E adoption; immutable baseline and compiler flags are unchanged.

| Working source | Browser result, no retries; normal controller exit0 |
| --- | --- |
| Focused13a plus local classes |12/12 targeted configurations |
| Earlier6d plus local classes |12/12 targeted and32/32 presentation configurations |
| IndependentDF6 plus local classes |12/12 targeted configurations |

Targeted configurations cover CS/EN light/dark in desktop Chromium, mobile
Chromium and mobile WebKit: card/action bounds, identity width, exact destinations
and below-used-space4GiB/disabled/aria-invalid followed by32GiB/cleared/enabled.
No operation is submitted.24 current-working validation samples have minimum
11.746504:1, weight500 and2px marker. These are working artifacts with dirty
build-info, not clean Nix or hosted CI evidence.

The32-case presentation cohort covers member, selected administrator, support and
admin My; fields, unsubmitted create/edit/delete/resize states, normal/320/768px,
keyboard/focus and rendered contrast. Before-fix456 width phases,1872 control
observations and12440 text samples overlap; they are not separate journeys.
Historical fixture corrections and all genuine negatives retain their source.

Clean packaging, exact-head hosted checks, paired guards and protected evidence
publication are separate pending gates. The broader storage/UX03/04 audit stays
partial, including the newer dataset-picker error and remaining read/feedback
branches. Fixtures do not certify live permissions, storage/quota behavior,
physical Safari/display, OAuth or full WCAG. Final visual judgment remains human.
