# Match the own-server retry control to its field — 2026-11-10

REQ-010 / REQ-054. The approved UX-03 finite dashboard survey rendered the
existing personal server selector's membership-error state. On fine-pointer
Chromium the selector measured 36 px and its adjacent Retry measured 32 px.
Keep this conditional action at the same existing 36 px field height. Shared
coarse-pointer rules retain 44 px. The existing membership, authenticated ID,
owner and bounded pagination contracts are unchanged.

The existing owned draft PR227 already contains this component and targets
main. Preserve its current branch/base and earlier request; do not duplicate
or retarget it, choose a DASH-09 model, or port the feature into the older
experiment. The list-context correction remains separate draft PR272 against
kerrycek-021126. The paired candidate adds only this class to that list candidate.

The existing checked, explicitly selected browser file now measures the field
and conditional retry at 1280, 320 and 768 px for each existing failed-membership
fixture; it checks their wide-row baseline, visible keyboard focus, document
containment and successful retry. No CSS-string mirror unit test is added.

Initial isolated c045 probe evidence retains the real 32/36 height mismatch.
Its later reload assumed settings persisted despite the private observer's
initialization script resetting them; that is an observer limitation, not a
product persistence failure. Subsequent presentation fixtures select Mine
explicitly after their own reload. All data and writes are intercepted; no real
account, VPS or existing object is changed. No physical display or Safari claim.

Prepared source change only. Exact-lock checks, raw browser parity, focused
head CI, immutable artifacts and paired preview/TODO delivery are recorded
separately after execution. Broad UX-03/UX-04 remain partial until the finite
main audit and historical scoped evidence reconciliation are complete.

Exact-lock source checks completed: pinned ci:quick, existing unit suite
(2364 tests/359 files) and production build pass on this source.
All15 targeted raw cases pass across Chromium, mobile Chromium and mobile
WebKit on their first execution, zero failed/flaky/skipped/retries. The four
failed-membership fixture kinds yield36 measured field/retry pairs at three
widths, each36px fine-pointer or44px coarse-pointer with visible focus.
The existing server-preference fixture can issue intercepted preference PUTs;
this is not a live API, permission or OAuth claim. Clean immutable builds,
new-head CI and paired delivery remain pending.
