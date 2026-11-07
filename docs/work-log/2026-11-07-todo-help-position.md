# Remember contextual help placement

Approved TODO UX-05, proposal 7bf8689f835764ae; REQ-053. Implement the approved
single Top/Bottom design as a browser-local preference, defaulting to Top.
The existing settings popover (in the cumulative preview) and profile settings
expose it. This topic is based on the experiment baseline, whose account menu
still hosts preferences; the cumulative preview retains the later dedicated
settings button. No API schema, transport, permission or public layout changes.

Keyed sibling rendering changes actual reading/tab order while preserving both
help expansion and unsaved page state. Operational errors stay inside page
content. Console pages retain their exemption. Successful preference reset also
restores the browser-local position; account payloads exclude this preference.

Terminology: locked vpsadmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff,
read docs/i18n-cs.md and docs/agent-instructions/localization.md. Both UI languages
are covered. External KB capture contracts were not available in this workspace;
these checks cannot certify external KB pages/screenshots.

Local provider/layout tests: 9 passed in each tree. The settings provider and
model are adopted into the existing scoped ESLint/format coverage; the new
browser spec is in strict TypeScript coverage and the mobile WebKit allowlist.
The shared preference selector is extracted to keep the header within structural
budgets. Initial harness failures (dependency symlink, incomplete stored settings,
and the navigation-close test ID) are corrected without weakening assertions.
Exact package browser checks, full CI and release activation are recorded in the
PR and private operations continuity after execution. Prepared work
is distinct from a deployment; no merge or production authorization is implied.
