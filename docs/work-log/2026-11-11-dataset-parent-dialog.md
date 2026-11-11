# Dataset parent in the subdataset dialog (prepared, 2026-11-11)

Approved NAS-11 version `c333d8f120e609cb` requires the parent to be clear before
confirmation. The CS/EN dialog title now contains the complete existing dataset
label and wraps long unbroken names. Remove the redundant parent/API-ID box;
retain useful form fields, exact parent-ID creation payload, existing gates and
cancel/reset behavior. A numeric label is never treated as the dataset ID.

`Modal.title` accepts a React element as well as a string. This type-only widening
has byte-identical emitted JavaScript; the title markup and accessible-name
wiring are unchanged. The dataset supplies one wrapping span. No API, SDK, BFF,
dependency, role contract or runtime configuration changes.

Terminology follows locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` (`docs/i18n-cs.md` and localization
instructions), read through the resolved flake source. The external KB workflow
was inspected read-only; no React source/capture binding was found. No legacy
pin, KB source, capture or publishing change is claimed.

Private fixture verification: the actual db4d preview fails four baseline checks
specifically on the missing parent in the accessible title. Both focused and cumulative dirty
working builds each pass 40 Chromium/mobile WebKit cases, CS/EN x light/dark: member,
selected-owner administrator, administrator My with a numeric label distinct from
ID, support My, and foreign-owner support read-only. Full title text geometry at
normal/320px, exact intercepted403 payload, retained draft, keyboard roundtrip,
cancel/Escape/reset are checked. Positive writable-role cases assert no page
errors; read-only support cases assert no create action or writes. All writes are intercepted;
this does not certify live API permissions. Working evidence is not a clean Nix
or deployed release claim.

The committed regression is explicitly selected for mobile WebKit as well as
both PR smoke profiles. The original format/adoption failures are retained in private evidence. A broad
formatter pass was discarded to avoid unrelated page changes and structural-budget
growth. The new test is added to the existing strict adoption inventory and
TypeScript roots; the immutable debt baseline and compiler flags remain intact.
Strict adopted E2E types and BFF type-contract6 tests pass in both trees.
Four separate actualdb4d baseline capture cases pass with the OLD title expected;
these capture the original UI and are not counted as repaired regression passes.
Fresh focused npm ci and full ci:quick pass after strict adoption. Actual pinned
CLI selects20 cases in each of Chromium, mobile Chromium and mobile WebKit.
Hosted focused CI, clean-source browser and release outcomes remain pending. Prepared only: no merge,
approval, API/production/newadmin or paired preview deployment in this change.

Private evidence: `/data/webui-browser-runner/verification-20261103/todo-dataset-parent-dialog-20261111`.
Related requirement: REQ-048.
