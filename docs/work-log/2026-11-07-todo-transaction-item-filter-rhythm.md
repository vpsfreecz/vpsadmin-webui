# Align individual transaction filter controls

Approved umbrella TODO UX-03; bounded to the top filter row on
/app/transactions/items. Requirements REQ-010 and REQ-073. The field is 44px,
while adjacent actions shrink to 32px on desktop. Retain 44px actions at every
width and use the normal Button size so action text aligns with the field.
Copy-link explicitly uses the normal Button size too.
Keep the existing filter grammar, URL, chips, copy feedback, help and advanced
form behavior. Advanced-form field/footer sizes remain outside this change.

Update the existing accessibility test's top-row geometry expectation and
include that same test in mobile WebKit. Adopt it into strict TypeScript, using
a fixed locator tuple and explicit dataset access. Remove the redundant unit
test of Tailwind class names; rendered dimensions are checked by the existing
browser regression instead. Retain the unit label/focus behavior check. Do not
add a parallel regression file.
Local exact-build matrix additionally covers CS/EN and light/dark with synthetic
member data, matching before/after captures and keyboard order in the existing
advanced form. No real API permissions or mutations are certified by fixtures.

This is a focused draft against kerrycek-021126; the cumulative preview preserves
previous approved work. No approval, merge or production deployment. Clean
package, CI and paired-preview outcomes are recorded in the operator continuity
and PR handoff after they actually complete. UX-03 remains partial across the
application; this does not certify other filter pages.
