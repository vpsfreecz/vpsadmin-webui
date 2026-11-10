# Preserve unchanged lifecycle timestamps — 2026-11-10

REQ-023; narrowly required correctness follow-up from the approved UX-03/04
finite selected-owner form audit. Do not mark either broad task complete.

The selected-owner form compares raw API dates with Date.toISOString output.
An untouched valid `2027-01-15T15:00:00Z` consequently enables Save when the
parser returns `.000Z`. The shared administrator formatter also replaces
nonzero seconds with zero, making an untouched second-precision value dirty.
The shared builder is also used by the VPS/member lifecycle panel.

Compare valid date values by epoch time and preserve the administrator input's
seconds. Retain null semantics, actual changed seconds, nonempty reminder
preservation, reminder clearing, state confirmations, receipts and locks.
No API, SDK, permission, localization or deployment configuration changes.

Existing renewal PR66 is merged; sizing PR207 is closed. No open timestamp
comparison fix was found in the current PR inventory. This is a separate
focused review change based on kerrycek-021126. The cumulative preview starts
at the actual paired731f8b6b; it preserves all earlier accepted changes.

The original current-package valid-Z browser failures remain in the private
selected-owner audit. New semantic unit tests first reproduce five failures
(two equivalent-instant cases and three second-preservation checks), with
11 existing/clear/change checks passing. An earlier launcher ran before npm
installation completed and found no Vitest; it is retained as setup evidence.
Source checks, browser evidence, clean Nix, exact-head CI and paired delivery
are separate pending gates. No live API timestamp serialization or permission
certification is claimed by synthetic tests. No live operation was submitted.

The second-precision boundary is confirmed by the API schema's lifetime
columns (`datetime`, precision nil) at22adc8b54d464e0f899550746b69181930da80fd.
This is schema/source evidence, not a new authenticated runtime response.
The focused experiment base has older inline selected-owner payload assembly;
it receives the same exported instant predicate in its two comparisons. The
current cumulative preview already uses the shared payload builder, whose
current null/state guards take precedence and remain untouched. An initial
focused browser run exposed this source difference; retain its failures.

Pinned Node24.21.0/npm11.19.0 ci:quick and production builds pass in both
source variants. The cumulative preview passes29 unit tests in4 files;
the older focused base passes25 in3 files. Eight new intercepted browser
scenarios pass per variant (CS/EN, desktop Chromium/mobile WebKit), with
zero retries, writes or page errors. Untouched forms and reason-only edits
stay disabled; changing a second and clearing a reminder enable Save;
restoring the original value disables it; nonactive state review/cancel
submits nothing. The experiment's original8 failures remain retained.

The focused inline adaptation required refreshing its existing structural
content hash after review. Its776-line allowance stays unchanged; no ratchet
or exception-review status was relaxed. The original hash failure remains
recorded. New clean package/CI and paired delivery are still pending.
