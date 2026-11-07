# OOM report filter dimensions · 2026-11-07

The maintainer requested continued implementation of approved TODO work.
UX-03 (review `7c773db80dfa673c`) covers matching control dimensions. This
bounded change applies REQ-010 and REQ-073 to the OOM report list filter row.

The help, advanced, copy-link and clear controls match the smart field's
44px height on desktop and mobile. Icon-only controls also have a 44px width.
All changes are local classes on these four controls. Shared components,
header refresh, text, dependencies, API adapters, owner scope, query semantics
and navigation remain unchanged. This does not choose the pending DIA-02 or
DIA-03 navigation variants or complete the wider UX-03 checklist item.

The browser matrix exercises CS/dark and EN/light with member, administrator,
administrator My view and support identities, using intercepted synthetic API
responses. It checks geometry, keyboard dialog opening and focus restoration,
advanced owner visibility, owner-scoped query parameters, copied URL, clear,
unsupported-token handling and 320px overflow. Writes outside the existing
initial UI preference are rejected. Fixtures do not certify live API rights
or physical Safari. Verification and deployment outcomes are recorded after
execution; prepared code is not merge or production approval.

Local validation: both branches passed `npm run ci:quick` and the existing
10 OOM list semantics unit tests. The clean prior artifact passed 16 browser
checks; the changed working build passed the same 16 checks in Chromium and
mobile WebKit. Exact package and CI evidence will be verified before preview
activation. The first prepared browser harness needed its container-relative
dependency link and existing BFF fixture interception restored. A broad source
formatter touched unrelated lines and triggered the existing structural budget;
the final source diff keeps four local lines and does not raise the budget.
