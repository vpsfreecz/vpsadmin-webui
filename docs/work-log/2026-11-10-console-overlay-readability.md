# Readable console connection messages

Prepared for approved UX03/04 and REQ-020; broad tasks remain partial.
The exact clean ab6 preview renders the disconnected body at approximately
3.128 CSS pixels on a320px viewport because the whole1280px terminal layer
scales to286px. The recovery button shrinks with the text. This was reproduced
with an intercepted held console document, not a live console failure.

Move only application loading/recovery overlays outside the terminal transform
and let their normal-flow content grow the viewport if required. Preserve the
iframe virtual size/transform and all session, reconnect, permission and API
contracts. Existing viewport tests gain a held-iframe regression for unscaled
text, local bounds, pointer target size, recovery and a single token creation
inCS/EN at320/768px. No translations or backend contracts change.

Pinned quick/build, exact-package evidence, current-head CI and paired preview
activation remain separate gates; do not infer delivery from this prepared note.
Initial private observer used page load for a held iframe and later aborted it
into an opaque browser error document; those setup failures are retained.
Using DOMContentLoaded and fulfilling synthetic held documents corrects only
the observer. No product retries, timeout budget or role assertion was relaxed.

Pinned quick/build passed on focused112/175 and cumulative219/102 sources.
All8 new targeted held-iframe cases fail on exact cleanab6 at terminal-scale
assertions, and the same8 pass on the working cumulative source. Both engines,
CS/EN,320/768px, local text bounds and32px fine/44px coarse recovery action;
reconnect retains one token creation. Clean Nix/CI/preview gates remain pending.

The first exact a046 finite matrix also exposed the dark revoke confirmation
label at3.997:1. Retain that failure; it is not accepted console readability.
A default-inert optional ConfirmDialog confirmClassName allows this one console
confirmation to select black text using the effective color scheme in dark mode. Its red danger surface, label and
handler stay unchanged; all other consumers retain their exact classes. Normal,
hover and keyboard-focus contrast are covered by the extended browser test.
The old a046 clean package and old558b CI are now superseded candidates, never
deployed. A new exact head and four clean outputs are required.

The first dark: utility experiment failed both dark checks because Tailwind
uses operating-system media while this app supports an explicit theme override.
Retain those failed working logs. The scoped light-dark() color follows the
existing color-scheme contract, preserving the original light foreground.
Expanded tests include explicit dark on OSlight, explicit light on OSdark,
and system mode on each OS scheme; no assertion threshold or retry changed.

The retained exacta046 confirmation regression fails4 dark-theme
engine cases at3.997:1 and passes4 light-theme cases. The unchanged8
pass with the effective-scheme foreground correction, including normal/hover/focus and
cancel without DELETE. R2 pinnedquick/build passed for focused112/175 and
cumulative219/102; newhead CI/cleanpackage/preview gates remain separate.
