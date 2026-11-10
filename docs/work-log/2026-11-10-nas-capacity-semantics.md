# NAS capacity semantics — prepared

Approved NAS-07 e5d9d8819d077b3a, NAS-08 7e8b56feebe70608 and
NAS-10 8007670707393ffa; REQ-048. Current1cf baseline16 fixture cases
shows a90% warning badge next to a50% green bar, a quota-only dataset
labelled unlimited, and a percentage bar with no configured limit.

Actual API22adc defines quota for the dataset and descendants, reference
quota for the dataset itself; storage status aggregates referenced/refquota
for VPS usage and converts byte values to MiB. Use referenced/refquota
and used/quota independently, sharing named values and VPS severity
thresholds between list and detail. Explicit zero limits have numeric
usage without a bar; missing measurements stay unknown. Keep each reference
quota value once, retaining distinct measured/available/referenced values.
No API/client/schema changes, writes, roles or query changes.

Locked terminology guide a65a4dfeb92a59df4a80a737a20bcbf8558793ff;
existing bilingual labels only, no new catalog terms or placeholders.
Existing PR255 only wraps identity/scope messages, so does not duplicate
this capacity change. Parent4f85 is a prepared candidate while PR269 CI
runs; this follow-up is not committed, published or deployed yet.

Meaningful model examples and intercepted browser regression are being
verified; no passing result is anticipated here. Physical Safari/display,
live permissions and whole WCAG are not certified. Full UX03/04 remain
partial and NAS06/09/11 context work is separate.

Working screenshots exposed a duplicate unlimited-used value introduced
by composing the shared summary. Keep the named detail value once and
retain the numeric usage in list cells; an explicit regression checks it.

Final focused source passes84/84 raw Vite scenarios across Chromium,
mobile Chrome and mobile WebKit,2workers/0retries, including the numeric
unlimited-summary deduplication assertion. Both pinned quick/build checks
and six model examples pass. Earlier compiled56 working cases predate
the small duplication correction and are retained separately. Exact clean
Nix/browser acceptance, focused CI and paired/result delivery remain pending.
