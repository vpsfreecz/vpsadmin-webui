# Memory pressure and daily history

The requested pressure view uses the existing React layout, table, filters and
navigation conventions. It keeps recorded duration separate from incident-policy
counts, with concise current-period facts and an accessible reporting-threshold
meter. Administrator My view remains scoped to its own account.

[REQ-077](../design/REQUIREMENTS.md#memory-pressure) and the
[product contract](../design/VPS_PRESSURE.md) describe server-side filtering,
current-owner history, UTC day boundaries and unknown periods. History requires
the backend's additive daily-total writer and a generated SDK containing the
new declarations. The React change has no migration and does not reconstruct
past data. English and Czech labels use Memory pressure / Paměťová zátěž.

Generated SDK request adapters, scoped controllers, routes and navigation are
implemented against a fixed development archive. Focused source, wire and component
checks do not establish deployed API behavior. Static and type gates, nonbrowser
script/BFF/unit checks and the production asset build pass, including focused
follow-ups for test setup and the new sidebar entry. Desktop/mobile browser verification and exact-source package checks are required before activation.
A compatible published SDK is still required before merge. No merge
or deployment is recorded here.

## VPS issues presentation

The umbrella heading is VPS issues / Problémy VPS; Memory pressure / Paměťová
zátěž identifies the issue type. Current rows omit observation-state boilerplate
and read timestamps. The native meter uses orange below 80 percent and red at
or above 80 percent, with the exact accessible duration unchanged. Existing
scoped links open the full-width VPS detail page.

Every displayed interval uses the account timezone, falling back to the server
zone through the shared account-timezone hook. Daily history shows both actual
UTC-bucket endpoints as localized dates and times with offsets, labels the
current bucket In progress, and retains unknown gaps. Formatting changes no
bucket identity, request range, total, API declaration or backend storage.
The five filters retain their existing submission and validation behavior.

Focused component, controller and adapter checks cover this presentation;
updated browser and package verification remain separate from the earlier
implementation's evidence. The generated SDK input and registry release
prerequisite are unchanged.
