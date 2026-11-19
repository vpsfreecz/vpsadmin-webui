# Clarify incident policy filters, settings and feedback

The incident policy forms now show effective limits, and report lists offer a
policy select. Clearer threshold messages and visible policy details address the
maintainer's usability feedback under REQ-051. Existing saved-policy tables and
authorized links remain in place. The running demo uses older source and does
not show this change.

The policy select uses one cached query to the authorized active registry. A deep
link to a retired policy retains its exact key as an option. Selecting a policy
preserves the owner, VPS and other filters while resetting pagination. A failed
registry query shows an unavailable state. Saved matches in recorded or audit-only
state retain their labels and links. Empty member responses can hide private
errors for matched policies, so they show neutral unavailable feedback. Only
exhaustive saved evidence visible to administrators can establish that no
policies matched.

Each limit input starts with its effective numeric value and a separate
Inherited/Custom choice. Untouched inherited fields still send null, including
when the other field changes. A custom value remains custom even if it equals
the default. Clearing or resetting selects inheritance. For a current custom
override, the API does not expose the inherited value. Selecting inheritance
shows a pending value until save and authoritative readback supply it. Failed
saves retain drafts; confirmation, preflight and durable locks for uncertain
writes remain in place.
The shared shutdown permission remains independent, including explicit false.

Policy details and shared settings stay visible. Removing the editor's duplicate
top border and padding closes the empty strip while preserving configuration,
capability and save feedback. English and Czech warnings identify the incident
report threshold and include policy names where available. Limit values combine
report counts and periods with the appropriate plurals. Sent notice status reads
Sent/Odesláno; internal delivery states are unchanged. This React source did not
contain the generic counting paragraph. Policy descriptions supplied by the API
remain visible. The affected catalogs no longer contain the obsolete inheritance
hint or Details labels.

No API, schema, generated SDK, dependency, lock, packaging hash or migration
change is needed. The actual Nov18 SDK archive, backend generation provenance
and registry-release-before-merge prerequisite remain unchanged. Locked terminology
revision: a65a4dfeb92a59df4a80a737a20bcbf8558793ff.

Application typechecking and seven focused files with 82 tests passed, together
with lint, format, locale/plural, structural, component, UI-string and mutation
audits and the asset build. Final source inspection also found that Clear filters
left the URL-backed policy key selected. The corrected handler resets it with the
other report filters while retaining page size and unrelated context. Its focused
semantics file passed 33 tests; affected typechecking and the final asset build
also passed. The original successful scopes remain recorded without a full rerun.
The documentation audit passed with 290 documents and 76 requirements.

Independent review of the committed changes precedes browser captures and package
verification at the final head. This record claims no browser or VM integration
result, Nix package build, CI result, publication or deployment. No server, reset
or session lifecycle operation was performed. The uploaded reference image and
prior verification artifacts remain outside this change.
