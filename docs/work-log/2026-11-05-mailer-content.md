# Mail administration content — 2026-11-05

This presentation change addresses REQ-053 and OP28–31 in the existing mailer
pages. OP27's bounded lists, local filters and mutation safeguards are retained.
The work starts from accepted commit
`5e0ee1974729e77cd4774281b841a33250c2e47d` on the separate
`dev/content-mailer` branch. No API, schema, persistence, authorization, real-mail
behavior or deployment ordering changes are introduced; rollback needs no data
conversion. Existing history and attribution remain intact.

Four list introductions, the connection introduction and the generic
translations subtitle are omitted. The mailbox's labelled SSL value remains in
Connection, and the duplicate header badge is removed. The template label is
shown once when known; missing/null labels keep the existing unavailable row.
Operational name and template ID remain separate.

Mail detail puts subject, time, ID and the existing user/template metadata in the
header, followed by sender and recipients, then the unchanged message body.
Plain text, sandboxed HTML and raw access remain available. A native collapsed
Headers section after the body retains Message-ID and Copy, Reply-To,
Return-Path, In-Reply-To and References. All recipient address/copy controls
remain. The existing log scenario now opens this section and checks the
preserved diagnostics; six additive synthetic fields exercise its optional
addresses/headers without changing any original request or security assertion.

Read-only translation guidance is quiet text at the same position, gate and
test ID. Language remains in the title and the parent template ID remains in
metadata. The deliberate enable-editing confirmation now states its effect on
future emails for that template and language. Main supplied the exact English
and Czech values for the sender/recipient caption, parent metadata and existing
confirmation-description key. Only these three values per language change;
`mailer/crud.ts`, unused keys, aggregators and the dialog/action helpers are
unchanged. The locked terminology revision is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

The recipient modal retains its exact label, one-address and comma guidance as
quiet text; the generic heading and repeated mode-selection tip are omitted.
Recovery for partially created recipient #55 and recipient #56 with an unknown
link result, locked drafts, manual review, explicit retry, 500-row caps and all action gates are retained.

An inspected template403 rejection displayed the same error in both the editor
and a provider-routed alert. The editor's existing conditional error now has a
local `role="alert"` wrapper, preserving its title, text, test ID and validation.
Only the redundant definitive-create and ordinary-edit error toast calls are
removed. Ambiguous-create and stale-edit branches, saved guards, targets,
drafts, retry and success feedback remain unchanged. Mailbox/handler local
create/edit/delete errors and partial-order recovery remain as inspected,
including retained older messages. Providers, primitives and parser-error
feedback are unchanged. Two added cases in the existing editor unit test check
local live feedback and draft preservation for create/edit.

Wave57 baseline passed 20 cases in two literal jobs with zero retries: 17 EN desktop
cases in 127.127 seconds of command time and three CS dark mobile in 28.665 seconds. All selected hashes
were stable. All 34 written PNGs (25 EN, 9 CS) were actually inspected, with native
frames supplying a legible CS template-list viewport and the latest retained
translation view. The historical operations-mailer-8 batch was only proposed;
user-Mail evidence is a separate consumer.

The baseline uses synthetic administrators at levels 90 and 100, EN at 1280×720/light and representative
CS at 393×727/dark at DPR2.75. Sticky headers overlap some full-page metadata;
modal lower errors/footers and long raw lines crop. The tall CS list is an
overview, not legible proof of every row. Retry, payload and remote-resource
outcomes outside those images remain fixture assertions/source evidence, not
live API or real-mail certification. Updated/new server values show saved data
installation before awaited invalidations; neither response arrival nor the
later retained frame proves complete callback settlement or an absent later
acknowledgment. No translation save cue or callback changes are made.

Quick checks pass: 40 tests across eight existing mailer test files, complete
private strict checking of all eight fixtures, i18n parity (8400 keys per
language), i18n structure, owned full-file/changed-case formatting and candidate
discovery (nine EN desktop plus two CS dark mobile cases). The repository-wide
formatter stops at the inherited deferred `TransactionInlineDetails.tsx`
adoption hash; that shared source/manifest is outside this package and remains
untouched. Its failure is retained separately from the owned formatting result.
The original payload/assertion preservation and whitespace receipts accompany
the source packet.

The parent-run app typecheck passed in 58.025 seconds. Standard frontend BFF
and explicit legacy builds passed once each, sequentially, in 23.291 and
23.422 seconds. Both complete 383-file output trees are retained. Fresh source,
dependency, installed-lock and pinned-toolchain graphs matched before and after
both builds; generated caches were recorded separately with no observed
boundary difference. Seven historical complete output trees and their receipts
also remain unchanged. Build metadata truthfully retains
`5e0ee1974729+dirty`. Existing chunk-size warnings were retained.

Main bound the legacy output to the separate registered port 5205 candidate and
verified 15 served paths against its complete local output map. The original
port 5201 proposal remains unchanged; a separate receipt records only the runtime
base-URL substitution. Storage's port 5201 candidate was untouched.

Wave63 passed all 11 selected candidate cases in two literal jobs with zero
retries and stable fixture hashes: nine EN desktop cases in 50.389 seconds of
command time (48.3 seconds Playwright), and two CS dark mobile cases in
17.620 seconds (15.6 seconds Playwright). All 25 written PNGs (17 EN, 8 CS) were
actually opened. One genuine 393×727 CS native viewport supplies legible context
for the 21989px template-list overview. A retained DOM snapshot independently
shows the editor's `role="alert"` inside its modal; this is DOM evidence, not a
screen-reader test or another screenshot.

The actual candidates show sender/To/CC/BCC and Copy before the plain/HTML/raw
body, collapsed Headers below it and all preserved diagnostics when opened.
The edit 403 modal shows one local error with its draft and Cancel/Save intact.
Recipient #55's retry-only-link recovery and recipient #56's manual-review lock
remain visible, with exact useful quiet guidance. Known template labels no
longer repeat; operational identifiers, default read-only guidance, parent ID,
title language, unsafe-deletion warnings and the EN future-email confirmation
remain. Missing/null label fallback is source-backed; CS confirmation and
mutation-recovery dialogs were not added to this finite candidate selection.
Unchanged mailbox/handler recovery uses the inspected Wave57 baseline.

The same geometry limits apply: sticky headers overlap some full-page content,
the unknown-link modal's lower error partly crops behind its footer, raw lines
clip horizontally and long-list images are overviews. Copy controls and exact
source targets are retained; clipboard contents are not independently proved.
Remote-resource blocking and zero-target-write, partial, stale or ambiguous
safeguards retain their exact source/unit/selected-fixture scope. These fixtures
do not certify real API/mail outcomes or complete callback quiescence. No save
cue or callback change is inferred from the displayed server values.

The final log update is the sole documentary difference from the complete
build-time source graph. The original build-time log, source/dependency maps,
complete output trees, served proof and raw baseline/candidate receipts remain
retained. No product, catalog, fixture or compiled byte changed after capture.
Shared requirement/adoption documentation, the inherited aggregate formatting
finding and whole-series review remain for final assembly. Whole-interface review
remains open.

No merge or deployment was performed.
