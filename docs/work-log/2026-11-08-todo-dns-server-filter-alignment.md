# DNS server filter alignment — 2026-11-08

Approved UX-03 / REQ-010. On the existing clean6c947 preview, desktop search
ended10px above the labelled visibility/zone selectors and actions. The legacy
left/right FilterBar wrapper centers an unlabelled field against the entire
labelled group. Use the existing shared child layout locally on this page so
its controls share the bottom edge. Let the search occupy a separate full row
on narrow screens and wrap the selector/action group within320px.

No shared FilterBar, labels, role gates, DNS mutation or query contract changes.
The finite cluster audit provides exact baseline fixtures and measurements.
Add browser checks for CS dark/EN light, desktop alignment, mobile390/320px
containment, coarse44px targets and unchanged read-only API requests.

Source checks, focused browser results, exact clean Nix output/CI and paired
preview activation are recorded separately when actually completed. This entry
prepares reviewable scope and does not claim deployment, live permissions,
physical Safari/display acceptance or completion of broad UX-03/UX-04.

The experiment-base topic adopts the complete touched deferred DNS tools spec
into the strict E2E project. Preserve original baseline hashes; remove only its
deferred entry and add its explicit root. A callback-populated query observation
uses a mutable container so strict control-flow analysis can see the result.
The main-compatible preview already adopted this file. No compiler guard is
weakened.

The first exact-package geometry checks passed layout but all four failed an
incorrect new query expectation: unfiltered requests correctly ask for total
count, while filtered requests omit it. Read the actual page/adapter contract;
assert initial count=true, then poll the filtered final request for no count
and retain absence of unsupported search/visibility/zone API parameters.
This corrects the test only; preserve failed traces and repeat exact-head CI
and clean provenance before activation. No runtime/query behaviour changed.
