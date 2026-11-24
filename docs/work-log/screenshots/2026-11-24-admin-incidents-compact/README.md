# Compact administrator incident views

These captures show the implemented Overview and History with synthetic data and
intercepted API responses. They contain no live account data. The source is reviewed
`d92652cb` with the final local desktop padding change and browser fixture updates;
the visible `d92652cb*` footer records that uncommitted capture state.

The four desktop images come from two final English/Czech capture-only cases at
1280 px. Both tables fit the 990 px content area. Cells retain 14 px text and use
12 px vertical padding. The eight mobile images come from the successful English
and Czech interaction cases at 390 px; the desktop padding change does not affect
them. Opened images show native Details after keyboard activation.

| View     | English desktop                            | Czech desktop                              | English mobile                                                                      | Czech mobile                                                                        |
| -------- | ------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Overview | [Initial](initial-overview-en-desktop.png) | [Initial](initial-overview-cs-desktop.png) | [Initial](initial-overview-en-mobile.png), [Details](opened-overview-en-mobile.png) | [Initial](initial-overview-cs-mobile.png), [Details](opened-overview-cs-mobile.png) |
| History  | [Initial](initial-history-en-desktop.png)  | [Initial](initial-history-cs-desktop.png)  | [Initial](initial-history-en-mobile.png), [Details](opened-history-en-mobile.png)   | [Initial](initial-history-cs-mobile.png), [Details](opened-history-cs-mobile.png)   |

All four interaction cases passed across two batches after correcting a Czech
test assertion. The final two desktop cases checked captures and geometry only.
See the [work log](../../2026-11-24-admin-incident-policies.md#follow-up-compact-administrator-views)
for scope, diagnostics and deployment status. The earlier gallery keeps its
original evidence and source revision.
