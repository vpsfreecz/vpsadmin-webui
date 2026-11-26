# Clear created-download feedback — BAK-09/10

Approved proposals25dcbec5bb9880fa and585a1a2c998b8e5c, human revision333.
The exact E9ED baseline had duplicate pending email/Downloads instructions and
called a failed response still preparing. Keep the existing status help and
remove the redundant introductory body. Give failures an explicit title and
other nonpending states a neutral title. Say where to follow a task only when
the actual create reply has action_state_id metadata. Immediate readiness no
longer claims that an email was already sent.

Runtime changes are local to DatasetSnapshotsPage and the CS/EN storage catalogs.
Request/response adapters, gates, snapshot/download status classifier, role and
selected-owner query, tracking/progress implementation and footer actions remain
unchanged. The result modal describes the initial receipt; Tasks and existing
completion notifications provide asynchronous progress. No polling redesign,
API backend change or claim of email delivery is included.

Terminology input a65a4dfeb92a59df4a80a737a20bcbf8558793ff was resolved from
the locked flake and both localization guides were read. Requirements REQ-048
and workflow prose are updated. External KB workflow/current f977 registry and capture bindings were inspected
read-only: they describe the legacy PHP UI, not this React surface. No legacy
pin, production KB or screenshot certification is changed or claimed.

Prepared, not merged or delivered. Native and rendered verification, exact
focused CI and clean package gates, paired previews and protected TODO evidence
remain prerequisites. Private evidence:
/data/webui-browser-runner/verification-20261103/todo-backup-download-feedback-20261111.

## Qualified local evidence before review

Both fresh pinned native builds and final full ci:quick pass;15 existing download
model/task-completion units each and strict public/private E2E types pass.
Runtime3 inverse bytes restore both parents exactly, protecting API/SDK/BFF,
status classifier, roles/gates/payloads, tracking, queries and footer behavior.
Actual CLI selects22 new tests each in Chromium/mobileChromium/mobileWebKit;
full hosted selections669/612/316 including the existing WebKit skips.

Frozen working focused44 and cumulative44 cover six returned states, CSdark/
ENlight, member and selected-owner administrator, desktop1440/mobile320,
exact payload, no extra writes/errors/retries, keyboard Escape, Downloads link
and background task success/failure notifications. These overlap and are not88
unique workflows. Actual-parent A4DE before-only4 cases confirm duplicated
pending instructions and failed replies still titled preparing; not repaired
regression passes. No live objects/identities/DB locks or writes; own TLS cleaned.

Retain original private13pass/4wrong-href-fail/2interrupted/25unrun evidence.
The old Downloads link already omits the selected-user query on both foundations;
this copy correction preserves it and the current page's selected user rather
than changing NAS14 navigation scope. The toast check selects the whole actual
toast. Initial runtime-lint adoption and helper path typos were setup errors,
corrected without changing budgets, compiler flags or existing debt.

Clean committed package/browser qualification, exact hosted CI, paired delivery
and protected TODO result remain pending. Fixtures do not certify live API
permissions, email/job execution, a physical Safari or a production release.
