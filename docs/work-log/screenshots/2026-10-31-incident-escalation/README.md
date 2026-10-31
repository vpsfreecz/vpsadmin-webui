# Implemented incident escalation views — synthetic fixtures

Captured 2026-10-31 with the repository's pinned Playwright fixture. These are
actual React views using synthetic users/VPS/API responses. They do not prove
real backend counting, permission enforcement, physical stops or mail delivery.
Unrelated missing IP/resource/storage fixture data are visible. The corrected
desktop full-page capture places its global header at the top.

The eight EN/CS owner/admin detail cases initially passed at source
`55a813b44edb915c7ed5ce68366d6d797a551606` (tree a9de950c). The later list-only
correction does not change detail/runtime/adapter/catalog bytes. The
final corrected app is `4343a02cb13ba42ae50a3276715f1c8e5b7765ea`, tree
`4bee7d1455f35cd422fc385fafda18486f6ee3ea`, exactly matching the successful
staged-source browser run. Its two overview cases and previously not-run mobile
old-API case passed without retries. English desktop detail was then recaptured
at 4343a02c with only a two-line fixture scroll reset to keep the heading/history
visible in the full-page image. That one existing case and affected E2E types
passed; all existing feature assertions were retained. The footer in a list
capture can show 55a813b4
with a dirty marker because the accepted correction was staged during capture;
exact tested-tree equality establishes its committed 4343a02c source.

| Image | View and capture source | SHA-256 |
| --- | --- | --- |
| [detail-desktop-en.png](detail-desktop-en.png) | Administrator detail; English desktop; 4343a02c + capture-only scroll reset | `a47760bbc40788f1b7fdf4dbe632e343f844df92eec0f081ee7185101b997405` |
| [detail-mobile-cs.png](detail-mobile-cs.png) | Administrator detail; Czech mobile; 55a813b4 | `ca4275b77bc0835554148fd6b37b36259618308c8b2e1989b0ba1d86bc699dc2` |
| [overview-desktop.png](overview-desktop.png) | Administrator combined filters; desktop; 4343a02c-equivalent staged tree | `6b8d2d263965c63213dca527fd271f1bc5206bf0d90d7b16036c0a42c7597449` |
| [overview-mobile.png](overview-mobile.png) | Administrator combined filters; mobile; 4343a02c-equivalent staged tree | `807c137d141957100c5e5694240980b123427f020871483de8b235745941fa9c` |

The initial 12-case run remains 10 passed / 1 failed / 1 not run. A canonical-limit-only
follow-up remains 1 passed / 1 failed; it never launched the old-API command. The final
synchronous-navigation correction passed two affected overview cases and one remaining
old-API case. No receipt is relabeled as a complete final 12-case rerun. Existing
b67c7917 screenshots/checks are historical and absent from this current media set.

See the [change record](../../2026-10-30-incident-escalation.md) for contract,
review, failure diagnosis and compatibility. The companion evidence commit
changes Markdown/PNGs and the two capture-fixture lines; runtime/toolchain
identity to 4343a02c is checked. Remaining test files and existing assertions are
unchanged; the updated capture fixture is typechecked and run as documented.
