# Consistent NAS, backup and task filter help — 2026-11-11

UX-06 approved review `0aac90ac81ec59f0`; requirements REQ-012/048.

NAS already exposes a question-mark button and SmartInputHelp modal. Backup
Center and Tasks had plain inputs with no explanation. Add matching accessible
buttons and the same modal, preserving the input, query, URL, API requests and
role gates. At narrow widths the task Clear control can wrap without widening
the drawer. Opening help does not execute a filter or issue an API request.

Backup Center Snapshots/Plans select datasets using name, full_name, label,
internal ID and the VPS resource label. Downloads match their ID, snapshot
label, resolved dataset label and format. Both search only loaded objects in
the current scope. Tasks matches loaded action labels (including tracked
metadata), IDs and targets and transaction labels, IDs and formatted concerns.
Neither new help text claims snapshot-name or full-history search.
The focused 13a branch also reuses the already-delivered 44px NAS Help class;
the current cumulative preview needs no NAS code change. Keep the same 44px
assertions on every surface rather than importing unrelated NAS features.

CS/EN terminology follows locked vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. No API/SDK/dependency changes.
The external KB has separate legacy captures; this React fixture verification
cannot certify its pages or screenshots. No legacy pin change is included.

The strict adopted Playwright regression covers member, administrator, admin
My and support My, all three surfaces, mouse/touch, Enter/Space, Close/Escape,
focus restoration, query/URL preservation and no help-triggered API requests.
Authentications/objects are intercepted fixtures, not live permission evidence.
Local and hosted verification outcomes are recorded separately in the task's
private evidence report. This is prepared work; no merge or deployment claimed.
