# Direct account access and visible logout

The third original queued request finds the nickname popup redundant and asks for
a logout icon near interface settings. Clicking the login now calls the existing
personal Account navigation callback. Keep the role indicator and full accessible
identity while truncating long visible logins. Logout is a native, labelled icon
link in the same compact settings/account row, using the configured original href.
It uses the same 36px desktop / 44px coarse-pointer dimensions as Settings. The
login remains aligned with Tasks; the extra icon takes space from its flexible
text rather than widening the sidebar. No account/public-status popup remains.

Interface preferences retain role-gated scope switching, language, theme and help
placement, clipped scrolling and Escape focus restore. Session preference and
logout/authentication protocols remain unchanged. The stable account automation
selector remains compatible with existing identity checks. Removed unused popup
strings in both catalogs; added the localized accessible Account:{login} label.

This task depends on the approved integrated sidebar/settings layout, so its
focused branch starts at local003117ce, with current main47b6992 and its generated
SDK contracts intact. The focused PR targets a frozen release-base branch with the same verified
integration source. Keeping that review base separate preserves the focused diff
when the feature is locally integrated into the combined preview, without implicitly
closing its unapproved draft. Do not publish unrelated integration history as this
feature's diff against main. No shared main/PR merge is authorized.

REQ-004/010/040. Localization procedure and both guides read at locked vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; effective site reference
`b83b26e1ba1c8e869ae3ffbcb5801ed071c3844e` has identical guides. Existing legacy KB
member.edit-profile navigation intent remains available through the canonical
Account destination; this adds a direct React shortcut and removes a redundant
popup. No legacy landmark, managed KB page or capture is changed or certified.

Prepared source. Existing unit/browser regressions are adapted to the intended
new flow without dropping role, containment, session, owner, keyboard or opacity
checks. The new role/language/theme browser matrix checks direct personal routing
and native logout-link invocation against an intercepted target, not a new live
SSO certification. Working source ci:quick passed (195 checked E2E leaves / 110 deferred), including
catalog/structural/strict checks; AppHeader and OAuth tests passed14. BFF and legacy
working builds passed. Clean previous-package baseline passed8; the new BFF control
matrix passed24 across three roles, CS/EN, light/dark and Chromium/mobile WebKit.
Actual desktop/mobile control and preference screenshots use synthetic data.

The broader legacy fixture batch finished41 passed / 5 failed. Four mobile cases
needed navigation reopened after Tasks closed it; the opacity case selected the
hidden desktop sidebar. Corrected navigation reruns passed12, including role,
session save, keyboard, short viewport and query preservation. The opacity case
also needed its simulated error to remain active while inspected, rather than
recover on polling; it passed2 after that deterministic fixture correction.
All original failures remain recorded. No timeout, forced click, retry or skip
was introduced. Existing touchscreen cases passed14 on WebKit; its existing desktop-only case
was correctly skipped there and was run separately on Chromium. That mouse case
still expected the superseded32px VPS filter action; it now checks the approved
44px action/field match and the new compact36px settings/logout controls, passing1.
Thus every selected unique scenario ran in its intended input environment; no new
skip was added. The new direct-control matrix is included in the normal WebKit
project list. Final clean package and paired-preview results remain pending. No API, BFF, backend or dependency edit.
