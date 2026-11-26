# Preserve DNS zone owner search drafts

The approved finite DNS form audit rendered the administrator creation form on
clean20c3a350. Typing a login converted every keystroke with Number(), rendering
NaN and issuing a read-only cluster search for NaN. Both Czech and English mobile
WebKit probes reproduced the defect; original screenshots, DOM and traces remain
in the private audit record. This is not a live permission finding.

Keep the lookup draft as text, and derive the positive numeric owner ID only for
validation and the existing API payload. Empty owner still creates a system zone.
Unresolved text disables creation and shows localized guidance, so a mistyped
owner cannot silently fall back to a system zone. Member creation still omits
owner and default_ttl; primary/secondary payloads and canonical zone names remain
unchanged. No API, SDK, BFF, dependency or held DNS feature change.

REQ-010 applies. The strict browser regression covers selected names, numeric IDs,
blank owner, unresolved/empty/error/held lookup and member mode in CS/EN, narrow
layout/focus, exact rejected fixture payloads and read-only search bodies. It is
included in both PR smoke tags and the explicit mobile WebKit test list.
Terminology uses locked vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
The KB contract pins legacy PHP vpsAdmin942c, not this React component; no React
owner form binding or KB publication is claimed. All browser/API writes are
intercepted fixtures; no live identities or objects.

Prepared source only. Source/browser, exact-head CI, clean package and paired
preview gates remain pending. No merge or production deployment.
