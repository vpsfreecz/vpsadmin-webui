# Content selection and documentation upkeep

The maintainer requested implementation of the content/process review's
recommendations: make ordinary verified health quiet, remove repeated
descriptions and organize screens around the user's task. This documentation
change gives those criteria one home in
[Product design](../design/PRODUCT_DESIGN.md#content-selection-and-hierarchy).
It preserves unknown/error states, action receipts and recovery, accessible
names, relevant operational details and explicit persistent-feedback exceptions.
Application changes are a separate reviewable change.

Current changes now use one file in `docs/work-log/`; root history remains with
a pointer. Contract/requirement/evidence upkeep follows actual impact, with new
IDs for new product requirements rather than every fix. Rationale and results
are linked instead of repeated. The existing visual review asks whether notices
need attention, descriptions add information and the main task is obvious.
English documentation and bilingual English/Czech PR descriptions remain required
(REQ-062 and REQ-064).

The clean-checkout recipes use `ci:pr` once for quick checks, script/BFF/unit
tests and production build. Focused development checks remain separate from
required remote CI. Setup guidance now includes the configured mobile WebKit
project, and DEC-011 records the later removal of desktop sidebar collapse.

A read-only sample of 15 recent broad-smoke runs found four push/PR pairs for
the same branch and head SHA. For example, successful
[push 41822238396](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41822238396)
and [PR 41822244823](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41822244823)
started three seconds apart for `47b6992e`. Source tags also overlap between
PR and broad selections. The sample does not compare PR merge trees, individual
job timing/billing or all selected cases; it does not establish removable
coverage. Broad pre-merge CI, workflows and test selectors are unchanged.

Verification: `audit:design-docs` and `audit:active-docs` passed in the pinned
Nix environment; `git diff --check` also passed. The lead reviewed the English
prose. Independent final general review of docs head
`a1b481906f9c394fcc367888370b4e6750a1d9c4` found no Blocking, Important or Advisory
findings for this branch. Its history was coherent, with no migrations. Required hosted
CI for the final PR head remains pending publication.

Source comparison establishes command expansion and the configured browser matrix;
it is not a browser, real API, deployment or usability result. No application,
schema, API, protocol, dependency or persisted-state changes; reverting the
documentation needs no state conversion. No merge or deployment has been performed.
