# Exercise filter history through application controls

The desktop Chromium jobs for [PR #277](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/42879678403)
and [PR #278](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/42888427182)
observed intermittent failures when a test manually dispatched a history event
after paging. The incident and OOM tests now use the list controls to navigate,
apply the next filter on the first page, and verify the filters, rendered rows
and request counts on browser Back and Forward.

Both tests passed three times in desktop Chromium and three times in mobile
Chromium, with zero retries. The adopted specs passed strict TypeScript checks.
The fixture tests intercept requests and use synthetic data.
