# Search error readability — prepared

Approved UX-04 `d5847413b2b70eae`, REQ-010. The finite AppShell residual audit
on actual clean preview ed91bc2a550fb7e0fd60d8df7ab2e361466ca730 confirms
small danger-colored error text on the overlay surface in both inline search
and the command palette. Actual dark samples are rgb(239,68,68) on
rgb(31,57,89), below the 4.5:1 normal-text target. Preserve the localized error
prefix and message, status/live-region semantics, pending/empty/result logic,
query scope, keyboard behavior, SDK and mutation contracts.

Change two presentation class lists only: use foreground text, medium weight
and a separate danger border. No new copy, routes, API calls or dependencies.
The existing PR243 pending-pagination dependency is explicit in this focused
branch and already exists in both current previews; it is not a new OOM fix.
No mirror unit tests are warranted for this class-only correction.

Exact clean baseline residual browser observations, synthetic data, normal and
320px views, and labelled software-contrast captures are retained under
/data/webui-browser-runner/verification-20261103/todo-appshell-residual-audit-20261109.
Initial private admin search fixtures used an obsolete response namespace;
those failures are retained and are not evidence of a product query defect.
Full corrected coverage, current-preserving prototype, clean Nix packaging,
matching provenance, exact six CI checks without failed/flaky browser tests,
paired preview activation and protected TODO readback remain prerequisites.
No production deployment, merge or whole-AppShell/broad UX03/04 closure is
claimed. Fixture roles are not live API permissions or physical display proof.

Current-preserving dirty prototype:8/8 cases,16 observed error states and32
normal/320px observations, member/admin, CSdark/ENlight, Chromium/mobileWebKit.
Minimum measured contrast11.746504:1; medium weight and separate
danger border asserted. All requests intercepted; no live writes, failures or
retries. This is not a clean Nix artifact or an activated preview. Pinned
ci:quick (113 checked/174 deferred E2E sources), typecheck, build and scoped
quality gates pass; exact clean integration and new CI remain prerequisites.
