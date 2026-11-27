# Contextual NFS help and container root filesystem

Approved EXP-03, reviewVersion `a16700d1358ce892`, REQ-048. Explain the actual
server options and the role of rootfs beside the existing NixOS mount example.
Terminology reviewed at locked vpsAdmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Contract and implementation

A compact shared explanation links the NFS server options in create, edit,
host settings and read-only export detail to the published nfs-utils
[exports(5) manual](https://www.man7.org/linux/man-pages/man5/exports.5.html).
It covers read-write access, stable-write acknowledgments, subtree checks and
client-root mapping. These are server options; all_vps, enabled and threads are
vpsAdmin settings. Do not imply that Linux defaults equal the current form values
or ask guests to edit server exports. Use the semantic link foreground, with
safe new-tab attributes and an accessible new-tab announcement.

The brief rootfs note belongs beside the persistent NixOS fileSystems example.
The host provides container rootfs in vpsAdminOS; the example adds an NFS mount
inside the VPS. Temporary snapshot exports keep command-only guidance and no
NixOS/rootfs note. Existing snippets, copy values, flags, payloads, ownership,
permissions and mutation/pending gates remain unchanged. No API adapter or route
is introduced.

## Source evidence and limits

API source22adc8b5 pins the reviewed vpsAdminOS source
`8e44a5124439b1f3048ffc56b1717614a5360358`. Its stable container module imports
container configuration, and [osctld LXC configuration](https://github.com/vpsfreecz/vpsadminos/blob/8e44a5124439b1f3048ffc56b1717614a5360358/osctld/lib/osctld/container/lxc_config.rb)
passes the runtime rootfs to the [LXC template](https://github.com/vpsfreecz/vpsadminos/blob/8e44a5124439b1f3048ffc56b1717614a5360358/osctld/templates/ct/config.erb).
This is reviewed source architecture, not certification of a new guest boot,
actual node OS revision or NFS mount. The primary manual and source SHA256
manifests, plus unchanged original Discourse screenshots, are retained locally.

The external KB workflow/registry was reviewed for this group. Its current
contract pins legacy PHP/API and has no React input. Do not replace a PHP pin
with this React SHA or claim that a KB cluster/capture or production KB refresh
was performed.

## Verification and status

Prepared and uncommitted. Both native app/strict browser-spec typechecks pass;
focused localization/design/structural/UI-string audits and cumulative working
production build pass. Native browser acceptance covers CSdark/ENlight, member/support/global-admin/My, actual emulated touch opening,
keyboard link focus, safe exact documentation target, unchanged drafts and zero
fixture writes. Verify persistent NixOS context and temporary snapshot absence,
plus relevant existing export contracts. Adopt the spec in strict coverage and
mobile WebKit selection. The dirty working artifact passed all30 new cases and
81 existing export filter/review/snapshot-shortcut cases without retry. First
local run used the English Root squash selector under Czech; original2timeouts/
1interrupted/27notrun retained, corrected to catalog label Omezení roota without
changing application/assertions/timeouts. DesktopEN rootfs and mobileWebKitCS
create captures individually reviewed. No live object or NFS mount tested.
Full exact focused quick/relevant tests/build and all6
original exact-head CI precede guarded paired previews and protected TODO results.
No new live object is needed for this presentation change.

Evidence: `/data/webui-browser-runner/verification-20261103/todo-export-selection-help-conflict-20261114`.
No merge/approval, API activation, newadmin/production deployment or builder
access. Direct console/migration audits are complete separately; EXP-05 still
requires a NEW isolated dev conflict receipt and normal cleanup.
