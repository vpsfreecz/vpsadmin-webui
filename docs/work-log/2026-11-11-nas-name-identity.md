# Dataset name and internal ID

Approved NAS-06 `cc5893067dab6c16`, REQ-048. Feedback confused numeric dataset
name 2943 with a second unlabeled #8675. The actual dev API resource maps its
name field to the model's cached full_name; parent/name recursion constructs
the hierarchical name. The integer id is a separate resource reference.
Source inspection at API22adc8b54d464e0f899550746b69181930da80fd establishes
this meaning; it is not a live data or permission test.

Use explicit CS/EN internal-ID labels on list cards/rows and the detail header.
Keep the desktop Name column, and name the dataset in mobile cards and detail
headings. Preserve existing name precedence, complete names, integer-ID links,
queries, filters, payloads and role/owner gates. This is a presentation change.

Localization guide pinned by vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` was resolved and read.
The external KB documentation/capture workflow remains separately verifiable;
this change does not certify its pages or publish KB screenshots.

New tagged browser regression covers CS/EN, light/dark, member, administrator,
My views and support across NAS/dataset aliases. It checks numeric-name versus
ID labels, keyboard navigation and exact ID links/read requests, long complete
name bounds at normal/320px, and no intercepted writes or page errors. All
authenticated browser data are synthetic fixtures; no live API permissions,
backend/OAuth success, physical Safari/display or complete WCAG claim.

Prepared status: baseline, working checks, hosted CI, four clean Nix outputs,
current-source browsers, paired preview and protected TODO delivery must be
recorded separately. No deployment or merge is implied by this source change.
Private evidence: /data/webui-browser-runner/verification-20261103/todo-nas-name-identity-20261111.
