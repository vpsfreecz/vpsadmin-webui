# Clarify the VPS operation list — 2026-11-11

The maintainer requested changes to DET-02 result9cac5603: the meaning of
“Všechny akce” was unclear. The shortcut opens the existing lifecycle operation
index, not every entry in More. Change its visible label to Show operations /
Zobrazit operace, align the destination title to VPS operations / Operace VPS,
and use plain group descriptions. Explain that Find on page searches the visible
list and opening a link does not run an operation. Preserve all links, selected
user/scope, role gates, action/state logic, forms and confirmations.

Approved proposal dc973dfc3f04c86c and both original acceptance criteria remain
unchanged. This is a correction of that result, not a new navigation model or
permission/API change. Preserve the exact original changes request/resultFor
and all human fields when a new agent result is eventually delivered.

Original standalone PR188 was closed unmerged by Kerrycek on2026-11-08 as part
of the maintainer-requested85-PR cleanup, superseded by integrated production
(PR223 closure audit). Do not reopen it or rewrite its history. Prepare a focused
follow-up on its preserved ecd4988c head, still based on13a, and reference the
superseded review. Cumulative work is an isolated child of prepared NAS09 E9ED;
no activation before that parent's own complete paired delivery.

The initial copy-only prototype has18+18 working passes, but a separate
rendered visibility probe shows the mobile list starts at770px and its actions
at988px in an844px viewport after the old link, scrollY0. Desktop actions start
at465px. The shortcut now includes #vps-operations; only that explicit fragment
focuses and scrolls the labelled operation-list region clear of the sticky header.
Ordinary lifecycle URLs and every operation/form target remain unchanged.
Back to that fragment restores the list entry and selected-user query.
Runtime changes are CS/EN catalogs plus this bounded navigation/focus behavior. Existing public regression updates
the expected visible label and exercises320px mobile width. It still checks
engine window.find, navigation/scope retention, read-only support and dangerous
form/confirmation cancellation with zero writes. Browser-chrome shortcuts, real
API permissions and physical Safari are not certified. Read locked terminology
a65a4dfeb92a59df4a80a737a20bcbf8558793ff and both language variants in context.
Legacy KB workflow f977 governs separate PHP/API contracts; no legacy KB pin or
capture/publication change is claimed. Source is uncommitted/unverified; builds,
matching baseline/images, strict checks, focused review, Nix4, six exact CI,
paired preview and guarded result-revision delivery remain outstanding.

The first explicit-fragment browser cohort retained2PASS/16FAIL. The lifecycle
controller has its own passive scroll-to-top effect; the initial child layout
effect was overridden. Keep that controller byte-identical and resolve the
explicit region in a cancellable requestAnimationFrame after passive effects.
The original desktop fixed-top<=100px assertion was also invalid when the whole
list fits the viewport and the document cannot scroll. Assert actual focus and
the first complete operation card in the viewport instead; do not loosen any
write/error, scope, Back or confirmation assertion. New refinement unverified.

Latest local qualification: fresh pinned builds/full ci:quick and12 relevant
units pass on both sources. Final frozen focused18 and cumulative18 Chromium/
mobile WebKit cases pass, plus mobile touch2 per source; retry0/page-errors0/
API-writes0 under explicit local UI-settings fixtures. The first complete
operation card is in the viewport; the labelled list receives focus, native
rendered-text Find works, selected-user query and Back are retained, dangerous
confirmation target/cancellation is intact and read-only support stays gated.
Two raw cumulative viewport screenshots were individually opened. Own TLS2
exactly cleaned, zero remain; no live identities/objects/DB locks/mutations.

Historical copy-only54 configured passes and the focused UI-settings16PASS/
2FAIL attempt remain separate, as does the initial visible-target2PASS/16FAIL
cohort. Catalog formatter noise initially exceeded the400-line budget; preserve
parent formatting outside the20 value edits instead, with no budget relaxation.
A source proof checks six runtime files, exact declared navigation/focus changes
under pinned formatting, and byte-preserved controller/API/SDK/roles/payloads/
confirmations/dependencies. No clean Nix, hosted CI or paired delivery claim
until their independent gates pass. Do not reopen superseded PR188.
