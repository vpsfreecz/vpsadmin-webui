# Expose the existing VPS action index

Approved DET-02, proposal dc973dfc3f04c86c; REQ-023. Add the approved visible
All actions entry from the VPS header to the existing lifecycle index. Reuse
VpsLifecycleActionIndex and its forms, groups and guards, rather than creating
a duplicate action registry. Keep the existing canMutateVps gate and context.
Opening or finding an action must not issue a mutation. No API, dependency,
permission or confirmation changes.

Terminology: locked vpsadmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff,
docs/i18n-cs.md and docs/agent-instructions/localization.md read. Czech and
English labels are checked. External KB capture contracts are unavailable;
external documentation cannot be certified by fixture checks.

Validation and deployment evidence are recorded in the PR and private operations
continuity after execution. This is prepared work, not merge or production
authorization.

The existing action-controls component owns the new link, preserving its path
builder and role gate without expanding VpsLayout. Keep All actions and More
together on a mobile row. Three existing lifecycle unit tests passed in each
tree; initial 18 browser scenarios passed before this final grouping. An early
new-test assertion assumed Delete was initially disabled; source inspection
confirmed the existing two-step confirmation contract. The test now opens and
cancels that dialog, verifies its target and asserts zero API writes, without
changing the confirmation policy. Browser Find is exercised through the native
window.find engine API and rendered action links; browser chrome shortcuts and
physical devices are not certified. Exact package checks and CI follow.
