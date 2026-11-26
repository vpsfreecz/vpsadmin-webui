# Wrap IP dialog identifiers — prepared

Approved UX03/7c773db80dfa673c and UX04/d5847413b2b70eae / REQ-010.
The finite audit of actual da5a14f found clipped IPv6 identities in route and
host-assignment dialogs at320px. The page itself did not overflow: Modal body
overflow-y:auto also permits horizontal content scrolling, hiding the identity
end. A root-only width assertion therefore missed the defect.

Five local identifier containers now allow anywhere wrapping: route assignment,
host assignment and PTR editing in IP detail, and host assignment/PTR in the
host-address list. Exact address/prefix, inputs, action guards, roles, query, API
and BFF behavior stay intact. The older experiment base did not render the
selected host identity in its assignment dialogs; show that existing selected
address there too. The current preview already renders it, so integration must
apply only the local wrapping classes and retain the current generated SDK and
parent-interface assignment contract. Do not port the older base's contract.

Five browser regressions inspect actual text-fragment bounds and element
scrollWidth at320px, rather than document width alone. They open drafts and
Escape-cancel with zero writes. On actual da5a14f all10engine executions fail
the intended local bounds, including PTRs with a full39-character documented
IPv6 address. Both complete touched specs are adopted into strict browser type
coverage; the frozen deferred baseline is unchanged. This focused branch also
retains the existing recorded OOM pending-pagination prerequisite.

Prototype/clean packaging/exact-head CI/paired deployment evidence must be
recorded as they complete. This entry is preparation, not delivery or whole
IP-consumer/UX03/UX04 completion. The164-configuration original finite audit
and all observer-failure evidence remain at their original da5a14f source.

Pinned focused quick/type/design/strict-browser checks and build pass,
115strict roots/172deferred. Initial JSON formatting and an existing proof-env
index-signature access were corrected; original diagnostics retained, frozen
baseline unchanged. On the actual-da dirty prototype, all10new regressions and
18full-file cases pass; four additional capture cases pass and two mobile
originals were opened. The exact five-wrapper inverse equals current runtime,
and the whole CSS inventory is byte-equal. These are intercepted fixture and
prototype results, not clean packaging, live permissions or delivery. Current
bothhosts stayda; all required exact-head CI and clean-integration release gates
remain mandatory. No live accounts, objects, writes or DB locks were created.

### Accepted integration evidence

Initial exact-head Mobile Chrome CI exposed a fixture initialization error in
all five new cases: their all-write guard captured an automatic debounced
PUT to webui_user_settings/ui/settings. All local identifier bounds passed;
failed traces confirm the preference path, not an address action. Configure
these geometry/cancel fixtures with supported local UI-preference persistence
and explicit English/light settings. Keep the strict all-nonGET prohibition,
complete text-fragment bounds and Escape cancellation; do not whitelist the
preference PUT or weaken the domain-write assertion. Product persistence/API
behavior is unchanged. The initial candidate and all failed/retry evidence are
retained and superseded before activation. A fresh focused head, all six CI
checks and new clean integration/package provenance are mandatory.

Pinned served legacy-mode reproduction on the same immutable initial1b22
runtime: all5Pixel5 cases fail on the preference PUT after the known debounce,
then all5pass with explicit local preferences. The same corrected five tests
pass in all3engines15executions, zero retries and zero API writes. Diagnostic
settle time remains only in the private reproduction, not a committed timeout
change. Strict browser type coverage115/172 and design audit pass; application
source, assertions, retries and frozen registry are unchanged by this correction.

### Existing preview evidence

Current integration starts at actualda5a14f, preserving the completed262header
and261traffic work and all current generated SDK/parent-interface contracts.
Only five existing identifier class lists change across three runtime files.
The selected host labels already exist here; do not replace current assignment
forms with those from the older focused base. Both spec roots, strict registry
and frozen baseline are byte-preserved; append only the new regression cases.
Clean packaging/exact263CI/actual delivery remain separate mandatory gates.

Initial focused263head1b22 failed five MobileChrome zero-write checks due to
automatic UI-preference synchronization in its geometry fixtures. The exact
failed path and all retry traces are retained. A pinned same-legacy-runtime
reproduction fails5before and passes5after explicit local preference setup;
all3engines pass15, with all API-write and text-fragment bounds unchanged.
Append only the fixture correction here. Runtime source, current SDK/API/BFF,
all219strict roots/registry/frozen baseline and the five wrapping classes remain
byte-equal to the initial preparedfb candidate. That candidate was never
activated; new exact head, fresh clean package provenance and release gates are
required. Do not retag oldfb screenshots or CI as this corrected revision.
