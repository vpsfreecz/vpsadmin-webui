# Export review and source navigation — 2026-11-14

REQ-048, approved TODO EXP-02 (98837542517e349e) and EXP-06
(465a77c6294343f2). Prepared on cumulative preview 48ccf1d; independent focused
PRs target kerrycek-021126 at 13a39a5.

The creation review previously omitted Sync and Subtree check even though the
form sent both booleans. It now describes each current choice in Czech and
English. Sync controls whether replies wait for stable storage; Subtree check
adds the server directory-membership check. Defaults and request construction
remain unchanged. API resource semantics were inspected at dev API source
22adc8b54d464e0f899550746b69181930da80fd;
[nfs-utils exports(5)](https://www.man7.org/linux/man-pages/man5/exports.5.html)
provides the detailed server-option contract.

The export detail previously repeated its source in the header and summary,
while its dataset link sat among timestamps. The summary now owns the complete
wrapping identity and a standard secondary Open dataset action. The action uses
the existing dataset ID and /app or /admin base path after the existing ownership
gate. Snapshot identity stays beside the dataset; unknown dataset IDs produce no
link. Mutation and mount-instruction contracts are unchanged.

Terminology was resolved from the locked vpsAdmin input
a65a4dfeb92a59df4a80a737a20bcbf8558793ff, including both localization guides.
KB impact: React export form review and source-summary captures change; existing
legacy PHP navigation IDs and KB routes do not. No production KB publication.

Verification in progress: fixture browser tests cover cs/en, light/dark, member,
admin and administrator My views on Chromium and mobile WebKit; option changes
are checked against intercepted payloads, and keyboard source navigation against
the exact dataset URL. These fixtures do not certify live API permissions.
Source checks and final qualification results will be recorded before delivery.
No live identities or objects created; no API activation, PR merge or production
deployment. Paired previews remain on the preceding verified release until all
release gates pass.
