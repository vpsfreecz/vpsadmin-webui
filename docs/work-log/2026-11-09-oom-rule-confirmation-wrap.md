# Keep the complete OOM rule visible before deletion

Approved UX-03/UX-04 presentation audit, REQ-051. Actual isolated clean494 mobile
WebKit CS dark capture showed a long cgroup path clipped inside the confirmation
card. The document itself did not overflow, so the earlier viewport-only check
could not establish complete identification of the rule to be deleted.

Add local min-width and word-breaking utilities to the existing pattern value.
Keep the complete original text, confirmation controls, pending state, queries,
rule references, payloads and role behavior unchanged. No API/BFF/dependency or
catalog changes. Focused branch is based on the explicitly requested experiment
base13a; integration must preserve the current null-to-undefined Badge typing
correction and any newer authorized preview, including the own-server repair.

Extend the existing rule-actions browser spec with actual text-range containment,
zero horizontal overflow, visible Cancel/Delete controls and cancellation without
an API mutation, in CS/EN light/dark. Adopt the whole touched spec into strict E2E
typing without resetting its immutable baseline. Existing table/row/edit/action
assertions remain. Source, browser, exact-head CI and clean paired-release gates
are pending. This local edit is not deployed or ready for broad completion.

Evidence remains synthetic; no live deletion, real API permission/OAuth or
physical Safari/weak-display certification is implied. The broad acceptance
matrix remains partial while missing consumers and this fix are verified.
