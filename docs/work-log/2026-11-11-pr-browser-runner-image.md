# Use a pinned Playwright image for PR browser checks

[CI run 43032578575](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/43032578575)
failed twice while installing browser system packages because GitHub-hosted
runners could not resolve the Ubuntu package mirrors. The Chromium and mobile
Chromium PR smoke jobs hit the same setup failure before any test executed.

The browser script job and PR smoke matrix use the official Playwright 1.61.0
Noble image, pinned to the registry manifest digest. Its browsers and system
libraries are preinstalled. Update both image references when changing the
locked Playwright version. Node and npm still follow the repository toolchain,
and the browser scripts, project matrix and artifact collection are unchanged.
