# Selected-owner resource package read feedback

The approved UX-03/UX-04 finite audit found silent environment/shared-package
selector reads and package-item errors rendered as the same empty label. Keep
the query keys and SDK semantics: selected-user assignments, shared owner null
(encoded as an empty query value), package-ID item reads and limit500.

Expose isFetching status and the shared ErrorState/retry beneath each affected
field or package. Render empty text only when there is no read in progress or
error; preserve cached items, drafts, roles and mutation contracts. Existing
labels/common translations are reused; no catalog or member-facing change.
Locked terminology input a65a4dfeb92a59df4a80a737a20bcbf8558793ff was read.

Both focused and cumulative quick/build checks pass. Four prepared-parent
negative fixtures genuinely fail at missing loading states. Sixteen working
configurations pass in Chromium/mobile WebKit, admin99/support21, CSdark/ENlight;
the same sixteen pass after preserving the old dirty worktree and applying the
scoped change onto the corrected reminder parent. All API mutations intercepted.

Repository regressions exercise held reads,503errors, independent retry,
successful populated/empty results and comment preservation. The cached-item
regression navigates within the app and advances the clock beyond staleTime:
503refetch retains8GiB, then explicit retry updates16GiB. Its first fixture
correctly failed the0writes guard because UI settings persistence was not local;
use the same local-persistence bootstrap as the other read fixtures, keeping
the guard intact. Corrected execution is recorded in the private acceptance
report. No product guard, role check or numerical threshold was relaxed.

The whole changed deferred user_resources spec is adopted into explicit strict
E2E roots; immutable baseline/compiler flags remain unchanged. Initial adoption
and type errors were corrected with typed HaveApiRequestCtx, not hash refreshes
or diagnostics suppression. Hosted exact-head CI, clean Nix package/browser
verification and paired delivery are separate subsequent gates. This focused
change alone does not close the entire Resources presentation group or UX03/04.
