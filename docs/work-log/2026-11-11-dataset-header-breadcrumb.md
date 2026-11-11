# Compact dataset detail context — 2026-11-11

Approved NAS-09 review4198c47d665050e9; requirement REQ-048. Source and twelve
actual-CDE intercepted baseline observations show separate context, name and
status/VPS groups. The approved request groups that context as a readable path
on desktop and allows complete names and operation state to wrap on mobile.

Prepare a dataset-only header using the existing ObjectHeader heading and tabs;
reuse an optional ObjectHeader path slot; leave all other detail layouts unchanged. Keep complete
name precedence and the separately labelled internal ID, existing return and VPS
links, numeric IDs, capability-dependent tabs and all local/transaction/stale
lock logic. The breadcrumb contains the existing return link and current full
name. ID, Busy/Working and VPS association remain outside the plain heading.
Keep object document-title markers and contextual Help priority0.

The focused13a foundation reuses only the delivered NAS06 CS/EN identity labels;
this does not reimplement or reopen that task. New wording follows locked
vpsAdmin terminology a65a4dfeb92a59df4a80a737a20bcbf8558793ff. This header task
selects no NAS14 navigation/menu variant. The cumulative preparation is based on
actual delivered UX06 E75B after its independently gated
paired delivery. No API/BFF/SDK/dependency change, merge or deployment.

Baseline12 cases, not a final acceptance claim: NAS numeric name and VPS-linked
long name with queued Busy, member/admin/support-My, desktop1280/mobile320,
ENlight/CSdark. Complete names, identity, VPS and Busy already exist; the current
work is compaction, not repair of a claimed missing-state bug. Private reports
retain exact sources/screenshots and tests. The final working compaction has twelve source-qualified observations and
four individually viewed images: desktop NAS155→127px and VPS207→187px;
mobile NAS214.984→206.984px and VPS408.969px unchanged. The rejected
first layout and intermediate mobile+8px cohort are retained separately.
Task acceptance still requires rendered regression, CS/EN/themes, role/return/focus/lock checks, strict
adoption, CI, clean Nix/current artifacts and paired/protected readback.

The mandatory13a foundation has a plain ObjectHeader heading and no PageHeading
module. The cumulative source has contextual heading Help. Reuse each existing
implementation through a small optional titleBefore/titlePathLabel slot, never
porting the whole Help feature to the old foundation. Without that slot, the
original heading classes, DOM, marker and Help implementation remain intact.
The dataset-only caller opts in, with the same name/ID/status/link contracts.

A new strictly adopted public breadcrumb regression covers member, admin,
admin-My, support-My and support; NAS versus VPS disks, numeric/full-name
precedence, CS/EN and light/dark, native return/tab activation, document title,
visible Busy diagnostics and the existing60s stale TTL: stale data keeps
last-known chain diagnostics while dropping authoritative Busy until online.
It certifies intercepted UI behavior, not live API permissions or physical Safari.
The optional path layout aligns context and identity with the heading's first
baseline on desktop; mobile keeps context/ID above the full-width name. The
ID wrapper uses the same small line height as its text, avoiding the measured
8px empty line growth. Default ObjectHeader consumers do not opt in.
