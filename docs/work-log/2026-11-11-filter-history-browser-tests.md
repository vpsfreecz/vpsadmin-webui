# Exercise filter history through application controls

The desktop Chromium jobs for [PR #277](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/42879678403)
and [PR #278](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/42888427182)
observed intermittent failures when a test manually dispatched a history event
after paging. The incident and OOM tests use the list controls to navigate and
verify the filters, rendered rows and request counts on browser Back and Forward.

Both tests passed three times in desktop Chromium and three times in mobile
Chromium, with zero retries. The adopted specs passed strict TypeScript checks.
The fixture tests intercept requests and use synthetic data.

The first hosted [mobile WebKit run](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/42924135330/job/130206158507)
showed that an OOM filter change could restore the previous page and cursor in
the URL while the list had already fetched page one. The page now writes the
filter change and cursor reset together (REQ-046). The regression changes the
filter directly on page two and checks the URL, request, results and browser
history. It reproduced the stale URL on the prior revision in mobile WebKit and
passed three times each in desktop Chromium, mobile Chromium and mobile WebKit
with zero retries after the fix.
