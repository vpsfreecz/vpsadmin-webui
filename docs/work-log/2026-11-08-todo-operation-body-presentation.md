# Operation body presentation

The maintainer's approved UX-03 and UX-04 continuation covers consistent
sizes, alignment and readable dark-theme groups throughout the interface.
A finite audit of transaction chains, items and action states found four
specific problems in the unchanged operation bodies at preview e4dc02bf.

At 320px, action-state badges and controls occupied the same horizontal
row as a long Czech title. This squeezed the title into almost one word
per line. Narrow cards now place the identity above wrapping badges and
controls, retaining the desktop arrangement, status text and progress.
Unbroken labels wrap inside their own available width.

A failed read of a chain's transaction items used small danger-colored
text on the ordinary card. It now uses the existing semantic error panel
and the existing localized Error/Chyba label. The body remains readable
without relying on red alone. Queries, role scopes, pin/track/cancel
handlers, links, payloads, polling and the OAuth BFF are unchanged.

Failed-step links in action and chain summaries had 2.65:1 contrast on the
dark action tile. They now use readable text and a persistent underline,
retaining the explicit Failed here/Selhalo zde label and exact target.

The small payload error heading used the same danger foreground on an
ordinary card. It now retains its explicit error label and medium weight
with the normal readable foreground; payload contents and copy actions
are unchanged. The same browser regression measures this heading too.

REQ-009 and REQ-010 apply. Terminology was read from locked vpsAdmin
revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff. No catalog, label,
member navigation or KB workflow was renamed. External KB screenshots
have not been recaptured by this fixture audit.

## Verification and limits

Baseline smoke: six member desktop Chromium scenarios passed on the exact
clean e4dc02bf frontend. Its 320px action-list image and the actual dark
chain error image establish the first two problems. Computed styles from
the same exact build establish the failed-step link contrast deficit. A broader finite fixture
audit is running separately; it must not be reported as complete yet.

Existing browser specs gain responsive row geometry, keyboard focus,
zero-write and localized semantic-error/contrast regressions for member
and administrator routes in Czech dark and English light themes. Source
checks, exact packaged verification, CI and paired preview release remain
pending. This local change is not merged, deployed or production-ready.
Fixture roles do not certify live permissions, OAuth, physical Safari,
weaker physical displays or whole-application accessibility compliance.

Evidence: /data/webui-browser-runner/verification-20261103/
todo-operation-body-presentation-audit-20261108. The broad approved tasks
remain partial; previously accepted filter-only evidence is retained.
