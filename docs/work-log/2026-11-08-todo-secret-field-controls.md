# Single-line secret field action dimensions

Approved TODO UX-03 (7c773db80dfa673c), bounded presentation correction.

Rendered TOTP enrollment/recovery and newly created metrics token dialogs had
36px single-line inputs beside32px Reveal/Copy actions on desktop. Match those
actions to36px through local conditional classes in SecretField. Coarse-pointer
44px minimums remain; multiline textarea actions intentionally stay compact.
No API, role, masking, clipboard, text, dependency or BFF behavior changes.

Source consumers also include member/admin TSIG secret dialogs and metrics-list
secrets; those use the same primitive. This change does not include held DNS
work, change their workflows or claim untested live permission acceptance.

The new browser regression drives intercepted synthetic TOTP enrollment/recovery
and metrics creation, checks reveal/hide, exact clipboard values, keyboard focus,
matching desktop/coarse dimensions, multiline action size and320px containment.
CS/EN, light/dark, Chromium/mobile WebKit are required. The sample TOTP seed and
invalid token/recovery strings are synthetic fixtures, never real credentials.

Prepared state: local source change only. Checks, clean packages, exact-head CI,
matched screenshots and paired preview activation remain to be completed and
recorded in review/operations evidence. Broad UX-03/04 remains partial.
