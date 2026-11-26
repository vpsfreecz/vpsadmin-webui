# Preserve manual lookup scrolling under the pointer

Requirements: REQ-010, REQ-023, REQ-060.

Original cumulative a93 Chromium shard2 retained a real failure in the Czech390x844 owner lookup after resizing. The final owner option was not hit-testable after the one deliberate list scroll. Original job140132604532, logs and25MB artifact15149358015 are preserved externally with verified GitHub SHA2564aaf6a16317f0905ca96953cb487c7fc130f4d2d4b20b3d544244dd34c982c74. No preview was activated.

The screenshot retains a highlighted middle option under the stationary mouse rather than the end of the list. LookupCombobox applies the same scrollIntoView effect to keyboard navigation and pointer hover. Scrolling/resizing can move rows under a stationary pointer; that highlight must not request another programmatic scroll. Track whether an active-option change requests scrolling: new results and ArrowUp/ArrowDown retain the existing reveal behavior, pointer hover updates the accessible active option without undoing a manual scroll. Click, touch, Enter, Escape and focus behavior are unchanged.

A focused regression fails against the old component because pointer hover invokes scrollIntoView. It also verifies preserved list scroll position, accessible active identity and that subsequent ArrowDown still reveals the next option. Original eight viewport/language browser scenarios, hit-testing and single physical tap/click assertions remain unchanged. No retries, waits, skips or budgets are added. Exact quick checks, focused lookup tests, build, all five local Nix outputs, repeated original three-engine browser scenarios and final full hosted checks/logs qualify the successor. Previous full local script/BFF/unit baselines remain identified separately; focused successor checks do not claim a physical full local rerun.

Prepared as a bounded integration/CI repair in existing336; no main merge, production/API activation or builder access. Paired promotion and served-dev acceptance remain pending.
