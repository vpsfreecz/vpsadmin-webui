# Readable DNS default-TTL validation

The approved UX-04 presentation audit confirmed12px,400-weight red validation
text at3.121:1 against the ordinary dark DNS settings card. Both Chromium and
mobile WebKit measured the same computed colors on clean preview cd204643.
Light-theme feedback already measured5.973:1; original screenshots and
measurements remain in the private audit record.

Use the normal readable foreground and medium weight for the existing invalid
TTL feedback, with a separate left error marker. Keep the same CS/EN message,
validation function, aria-invalid/describedby relationship, valid help text,
Save gates, role/query/mutation contracts and current SDK imports on integration.
No held DNS PR116/117, API, BFF, dependency or wording change belongs here.

REQ-010 applies. The strict browser regression covers both languages/themes,
member/admin routes, normal/narrow geometry, actual keyboard focus, readable
feedback and separate marker, invalid→valid→invalid→reset with unchanged Save
gates and zero API writes. Fixtures are not a live permission, physical-display,
Safari or WCAG certificate.

Prepared source checkpoint: source, browser, exact-head CI, package and paired
preview checks remain pending. No merge or production deployment.
