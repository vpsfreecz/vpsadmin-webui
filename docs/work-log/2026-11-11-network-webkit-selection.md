# Select the network regression in mobile WebKit CI

The existing host regression `vps_host_address_text_wrap.spec.ts` has both Chromium smoke tags but was
absent from the mobile-WebKit project's explicit testMatch allowlist. The actual
pinned CLI selects4 cases in each Chromium profile and0 in WebKit before this
follow-up. Prior six-green CI receipts remain historical, including that omission.

Add only this filename to the WebKit allowlist. Keep all existing browser
projects, tags, retries, assertions, fixtures, API payloads and runtime files
unchanged. A source test must be in both its required profile selector and strict
type inventory; one does not imply the other. This follows approved UX03/UX04
verification, not a new product change.

After-change pinned CLI and appropriate type/design/format checks, new exact-head
CI, clean cumulative packaging and paired evidence are pending at this checkpoint.
No merge, approval, stage or activation is claimed.
