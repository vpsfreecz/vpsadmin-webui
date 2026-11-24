# Access CI and fixture parity follow-up

REQ-010, approved UX-03/UX-04, existing draft PR267. Original-attempt CI on
9a3895c1 reports eight host-copy cases counting the automatic UI-settings PUT
in both Chromium projects, plus four desktop generated-password cases with a
34px input instead of36px. The exact focused Vite host case reproduces the
unexpected PUT locally. Its password case passes in the pinned browser image;
the CI34px failure is retained rather than presented as a local reproduction.

A fixed height alone is insufficient when flex-1 supplies the basis in the
narrow column. Set the existing min-h-9 alongside h-9 so font/intrinsic sizing
cannot shrink the field below the required36px; the44px coarse minimum still
wins. No source credential, callback, API, BFF, role or lock contract changes.
The host-copy fixture now waits for the Access page to mount, then retains its
existing15-second Copy visibility assertion. Two local Chromium traces show the
unchanged route still in Suspense while Vite compiles its lazy source. The
explicit30-second page-readiness prerequisite avoids testing absent child UI.
It also explicitly uses local UI preferences, so its existing
zero-request-write assertion still fails for any attempted mutation without
confusing automatic preference synchronization with a VPS action. No request
is ignored or filtered by the assertion. Other workflow fixtures retain their
existing server-preference behavior. Include the actual Access specification
in the mobileWebKit selector, matching the approved two-engine coverage.

Both previous f0c and ba936 stages are held; no CI retry, bypass, activation,
production/newadmin or human-state write. New focused/integrated checks,
package provenance and paired/public/TODO delivery remain separate gates.

The newly included WebKit pending-result probe also waits for the real progress
modal to be removed after Continue before measuring the page behind it. Its
original native-width overflow failure is retained pending the corrected probe;
this does not certify any untested overlay state.

The WebKit result probe records viewport overflow elements and waits two render
frames after viewport resize before reading geometry. All numeric containment
assertions remain unchanged. Its qualification is pending actual rerun results;
failed, successful and pending native-width original failures remain retained.

Initial54 local Vite executions finish45pass/9fail: two Chromium cold-page
preconditions, six WebKit native-result overflow readings and one mobileChrome
password keyboard probe while completed-action focus restoration was settling.
The password probe now requires the actual Generate action to be enabled and
the progress modal absent before testing the unchanged keyboard round-trip.
Do not call these failures fixed until the corrected cases actually pass.

The WebKit overflow survives modal-removal and render-frame prerequisites in
all three outcomes. It is a real focused-base containment gap, not a passing
probe. The integrated source already has a min-w-0, overflow-hidden wrapper
around the saved-key native selector, with a visible focus-within ring. Apply
only that same bounded wrapper in the focused source, leaving every option,
value, callback, role and guard untouched. Preserve line count and the existing
structural review allowance; refresh only its content hash and rationale.
The integrated application needs no second wrapper. Actual before/after
verification is pending. The first diagnostic also tried optional package
metadata capture on raw Vite (HTML instead of build-info JSON); retain that
tooling failure and limit optional package capture to served-build runs.

Pinned ci:quick and production build passed on both focused112/175 and
integrated219/102 sources. Focused actual Vite fixtures qualify54 distinct
configurations across Chromium, mobileChrome and mobileWebKit. Initial run and
any source-correct cold-load replacements are recorded separately in the
external evidence; no assertion, API mutation gate or CI retry is relaxed.
This is fixture evidence, not real API permissions or physical Safari/display.
The focused selector containment matches the existing integrated wrapper.
Original45pass/9fail and diagnostic failures stay retained; the corrected
source qualifies the same54 configurations plus all5 existing WebKit cases,
with exact counts and prerequisites in the external evidence. Four clean Nix
outputs, exact new-head CI and paired delivery remain pending.
