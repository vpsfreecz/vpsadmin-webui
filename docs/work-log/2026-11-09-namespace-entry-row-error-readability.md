# Readable namespace-map existing-row errors (prepared)

UX-04 approval d5847413b2b70eae; REQ-010. The original clean893 rendered
admin map detail showed 12px red field and base errors on semantic row surfaces:
2.2006–2.4950:1 in Chromium/mobile WebKit. Four intercepted field/base cases
and eight mounted text samples retain exact PUT payloads; desktop and mobile
originals were reviewed. Mobile retains its locally scrolling table, with one
field visible in the initial viewport. RGBA ancestor composition is recorded.

Change only four class lists: the three existing field errors and base error.
Use foreground text, medium weight and a separate danger marker. Preserve all
row/mutation state, error messages, numeric handling, save summary and API calls.
No new behavior or locale text. Keep the existing structural-debt allowance and
line count; update only its reviewed source hash and rationale.

PR150 head e0abf399 has direct component work for query failure guards and
summary extraction. Its changes were inspected and are excluded here. PR241
covers local add-entry errors and label alignment, not these existing-row errors.
Keep their independent histories and the current SDK/native touch sizing intact.

Pinned source ci:quick and build passed. A current1bb-preserving dirty prototype
passed16 cases in Chromium/mobile WebKit, CS/EN and light/dark, with32 contrast
samples at minimum8.2811:1,48 ordinary field dimensions/focus checks and16 exact
intercepted PUTs. The clean1bb baseline also completed16 observational cases;
16 of32 text samples were below4.5:1. The cohorts overlap, not32 unique cases.
This focused13a topic and dirty1bb prototype are not clean current Nix or deployed
evidence. Mobile retains local table scrolling; mounted offscreen field samples
do not claim that every error is visible at once. Actual originals were opened;
the first mobile base-error crop excluded the right action cell, so a dedicated
follow-up scrolls to the actual error before capture. Exact CI,
clean integration, matched screenshots and paired preview guards are required
before activation. The repeated unrelated OOM-history CI flake remains open;
no guard is waived by preparing this task. Broad UX03/04 remain partial.
