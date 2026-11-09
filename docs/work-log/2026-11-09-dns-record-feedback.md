# Readable DNS record field errors

The finite DNS audit measured local record-editor TTL feedback at 12px, normal
weight and 3.121:1 against the actual dark modal in Chromium and mobile WebKit.
The light modal measured 6.470:1. Measurements and actual screenshots retain clean
source20c3a350; they are separate from the settings-TTL fix in PR231.

Change only the shared FieldFeedback local/API error class lists to readable
foreground, medium weight and a separate left error marker. Keep every existing
message, warning style, validation rule, draft, Save gate and request payload.
No held DNS feature, SDK, BFF, API, dependency or owner-lookup change.

REQ-010 applies. Strict browser coverage checks name/content/TTL/priority and API
field errors, exact retained messages, all error themes, member/admin, normal and
320px geometry, real keyboard focus, local recovery and cancellation. Only the
API-error cases submit explicitly intercepted rejected fixtures. Both PR smoke
tags and the explicit WebKit list include the regression. Fixtures do not prove
live API permissions/OAuth, physical Safari/display or full WCAG.

Prepared source only. Source/browser, exact-head CI, clean package and paired
preview gates remain pending. No merge or production deployment.
