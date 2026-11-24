# Readable SSH key validation feedback

Approved UX-04 / REQ-010. The current own-profile audit on clean cb25ad6d
revealed small red required-field messages on the dark dialog surface.
Use semantic foreground text, medium weight and a separate 2px error border
for the label and key errors. Keep messages, ARIA relationships, automatic
focus, optional replacement key, edit/create payloads and API behavior intact.

The registered Playwright regression covers create label, create key and edit
label errors; Czech/English, both themes, member/admin and Chromium/mobile
WebKit. It measures actual text/background contrast, checks marker/weight,
1440/390/320px, keyboard focus, clearing errors and cancel without submission.
All input is synthetic. This does not certify live API permissions, key
deployment, physical Safari/displays or whole-application accessibility.

Pinned npm ci, ci:quick, build and final strict E2E type checks passed.
Controlled clean cb25 regression fails at measured dark contrast 3.121:1.
Corrected source-equivalent prototype28 passes, with84 actual width/contrast
measurements and minimum11.746:1. It is a dirty working build on13a, not a
clean-Nix or deployed candidate. No live API operation was submitted.

The initial prototype retained18 passes/10 test failures: correcting only
an empty label properly leaves the independent key-required error. The
corrected test checks both fields individually. An intermediate corrected
run was externally interrupted by SIGTERM after24 started cases; cause
unknown, no acceptance inferred. A full unchanged corrected rerun passed28
with the original2worker/90s/15s/retries0 budgets. All originals retained.

Exact focused CI and clean current-preview integration are pending. No
preview deployment or merge has occurred.
