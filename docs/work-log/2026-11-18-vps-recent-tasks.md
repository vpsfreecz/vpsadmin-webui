# Recent tasks below the VPS list — 2026-11-18

DASH-09 / REQ-051. The maintainer explicitly selected variant A: a compact
recent-task widget below the VPS list, visible by default, hideable, limited
to five rows. The later delegation permits completing the remaining models
using best judgement; this PR contains only the selected widget.

Use existing transaction-chain reads and status/progress labels, preserve the
current member/backend scope and administrator My/All filtering. Keep the
full Tasks drawer and history routes. Widget visibility uses the existing UI
settings normalization and persistence. Hidden content is unmounted and does
not poll. Failed reads are distinct from no history and have a local retry.
Long API-provided labels and object references wrap on small displays.

Terminology: locked vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff;
both locked localization guides were read. The widget introduces no API/SDK,
permission, mutation, task execution or production configuration changes.
The existing external KB contract targets legacy PHP/API, not this React
preview; no legacy capture or production documentation freshness is claimed.

Local complete ci:quick,16 settings/provider unit tests and a production build
passed. Four diagnostic browser cases passed on desktop Chromium/mobile
WebKit,including persisted hiding,reopening and failed-read retry. The first
persistence probe was corrected to seed local settings only once,instead of
overwriting the saved preference on every reload; assertions were retained.
New browser coverage uses isolated API/session fixtures,never production-account
mutations. Clean immutable focused package/full browser matrix,required CI
and cumulative paired-preview evidence remain separate pending gates.

Visual review follow-up: let long labels use the full mobile row width,with
status/progress below rather than squeezing the label into a narrow column.
Format task timestamps in the interface language and account time zone; Czech
uses a24-hour clock independently of the browser language. Tests assert this.
