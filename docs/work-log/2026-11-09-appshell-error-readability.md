# AppShell error readability — prepared, 2026-11-09

Approved UX-04 `d5847413b2b70eae`, REQ-010. The existing current-user403
and503 error bodies render small danger text on the ordinary card. Sixteen
new intercepted scenarios on clean828ae99d cover member/admin paths, CSdark/
ENlight and Chromium/mobileWebKit: eight dark samples measure3.121474:1,
eight light5.972853:1. Normal/320px widths and keyboard focus are recorded.
Four original dark403/503 desktop/mobile captures were opened. These are
fixture states, not real permission or OAuth tests.

Change only the two rendered AuthCheckFailed and AccountForbidden body class
lists to foreground text, medium weight and a separate danger border. Preserve
messages, headings, recovery links, auth gates and current-user requests. The
optional LoginRequired error has no error-bearing current auth transition;
leave it unchanged rather than claiming rendered proof of that branch.

Known PR243/4df369be is an explicit existing dependency from the13a experiment
base, already present on actual paired828. It prevents the observed old-head
OOM pagination flake; it adds no new runtime behavior to current previews.

Current-preserving dirty prototype verification and focused source checks are
pending. No new clean Nix package, exact-head CI, paired activation, TODO result
version, AppShell consumer closure or broad UX03/04 completion is claimed.
Evidence: /data/webui-browser-runner/verification-20261103/
todo-appshell-gates-audit-20261109. Physical display/Safari and final visual
judgment remain the maintainer's review.

Current-preserving dirty828 prototype16/16PASS,32width observations and16
actual keyboard focus indicators. Minimum error contrast11.746504:1; medium
weight and separate danger markers confirmed. Four before/prototype pairs
(eight original desktop/mobile403/503PNG) opened; they are not a clean final
artifact pair. Pinned ci:quick, build and design audit pass. Exact new CI and
clean current integration remain final prerequisites; no preview activation.
