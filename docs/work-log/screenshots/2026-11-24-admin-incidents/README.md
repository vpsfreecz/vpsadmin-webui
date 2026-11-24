# Administrator Incidents: synthetic views

These images show the implemented React Overview and History with synthetic
administrator, VPS, policy, evaluation and outcome data. They were captured
from reviewed `c27d70dbd4e96540de4d58027bfa6fce09a4df15` plus the narrow
post-review table-width/wrapping and initial-cutoff control corrections. The
sidebar's `c27d70dbd4e9*` identifies that dirty capture source, not the eventual
clean successor or a deployed release. SDK development artifact `0.6.0` is the
ordinary installed immutable `b619eb8` archive, SHA-256 `9cba0275…`, 348079 bytes.

| Language and width      | Initial Overview                            | Initial History                           |
| ----------------------- | ------------------------------------------- | ----------------------------------------- |
| English desktop, 1280px | [Overview](initial-overview-en-desktop.png) | [History](initial-history-en-desktop.png) |
| Czech desktop, 1280px   | [Overview](initial-overview-cs-desktop.png) | [History](initial-history-cs-desktop.png) |
| English mobile, 390px   | [Overview](initial-overview-en-mobile.png)  | [History](initial-history-en-mobile.png)  |
| Czech mobile, 390px     | [Overview](initial-overview-cs-mobile.png)  | [History](initial-history-cs-mobile.png)  |

Four administrator flows passed with server offset/cutoff metadata, two policies
for one VPS, Apply, paging, browser Back, Refresh, direction-only History,
outstanding period controls and the existing Reports route. A separate batch
passed the member, support and missing-capability cases without new endpoint
reads. All seven cases have passing results across these scoped batches. They
were not rerun together in one final batch. Two later capture-only cases updated
the desktop images after local padding and top-alignment changes. Both tables
fit without internal horizontal scrolling and keep the rightmost column visible.
The mobile captures and flow results retain their original scope.

Session evidence preserves the original selector and outer-guard assertion
failures, the cutoff race and the rejected wide desktop captures. Controls now
stay disabled until React commits the returned cutoff; server semantics and SDK
declarations are unchanged. Automatic test retries were disabled. Passing cases
had no page exceptions or attempted external requests. Optional `/config.js` and
`/config.local.js` probes returned localhost 404/aborted requests. API responses
were intercepted, with no live API, database or account access.

Overview images show the first viewport of the initial all-match page; History
images are full-page. The Czech catalog follows locked terminology `a65a4dfe`;
account/browser date formatting is separate from catalog language. These images
do not verify backend counts, authorization, evaluator effects, physical shutdown,
mail delivery, OAuth, package builds or deployment. The WebUI still requires a
published registry SDK before merge.
