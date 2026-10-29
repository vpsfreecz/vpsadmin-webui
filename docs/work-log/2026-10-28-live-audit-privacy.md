# Private live-audit diagnostics — 2026-10-28

Status: prepared, not merged or deployed. REQ-059/REQ-064/REQ-065.
The old optional live-audit driver duplicated filesystem setup and recorded raw
API rejection bodies, browser console messages, arbitrary exception messages,
authenticated screenshots and video with normal file defaults. Real user/token
values could therefore enter evidence even though the output is Git-ignored.
This finding concerns operator-side audit artifacts, not a public runtime leak.

Reuse the existing private-directory/file helpers (0700/0600 and symlink guards)
instead of another filesystem implementation. Record response URL origin/path,
HTTP status and content type only; discard query/fragment/userinfo and response
bodies. Record bounded error categories and console types without free-form
messages. Authenticated screenshots and video require separate explicit opt-ins:
E2E_LIVE_AUDIT_AUTH_SCREENSHOTS=1 and E2E_LIVE_AUDIT_VIDEO=1. They remain private.
The driver rejects any origin other than https://dev.crucio.cz before launching
or applying credentials. No production or authentication policy is changed.

This historical driver still uses legacy token bootstrap. This patch does not
turn that bootstrap into real BFF OAuth evidence; the current audit uses separate
real OAuth sessions and records that distinction. Prefer the current BFF-aware
fixture/manual flows. Never treat a legacy tool's empty/login page as a pass.

Verification: both diagnostic regressions and all 228 script checks passed,
along with tooling types and the documentation audit on the remote runner.
Initial attempts lacked rsync and then BFF test dependencies in this fresh
checkout; both setup failures are retained separately. No test or timeout was
weakened. The complete ci:quick gate also passed.
