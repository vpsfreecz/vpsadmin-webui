# Readable OAuth page error bodies (2026-11-09)

Approved UX-04/d5847413b2b70eae, REQ-010. The clean current preview candidate
`e15bb1d14106dd253386e5cfe28fc298ae80f5f0` renders login, callback and logout errors
with 14px normal-weight danger text. An isolated served-package probe measures
3.12147:1 in dark mode and 5.97285:1 in light mode, independently in Chromium
and mobile WebKit. Six dark assertions fail the normal-text 4.5:1 threshold;
six light assertions pass. A separate12-case presentation cohort passes
normal/320px containment and available keyboard focus. These cohorts overlap.

Change only the three existing error class lists to foreground text, medium
weight and an independent danger border. Preserve the error string, copy
content, retry/status links, safe-path handling, OAuth state/PKCE, token
exchange and logout behavior. No provider, API, BFF or localization change.
The current OAuthShell subtitle removal stays outside this focused13a branch.

PR150's paginated current file list has no OAuth-page overlap. The large diff
endpoint rejects >300files; the paginated file API was used instead.

Evidence: `/data/webui-browser-runner/verification-20261103/todo-oauth-presentation-audit-20261109`.
The prototype, focused quality/build, exact CI and clean current integration
remain separate proof stages. All browser authentication failures use synthetic
fixtures; there is no actual provider exchange or liveAPI mutation, physical
Safari/display or fullWCAG claim. Broad UX03/04 remainPARTIAL39; no consumer
closes from this change alone, and no production deployment or PR merge.

A separate4-case storage-denied logout probe confirms the same14px400
3.12147:1 dark /5.97285:1 light defect in both engines. The initial12-case
remaining-state cohort has4logout passes and8 fixture selector failures:
Spinner renders an aria-hidden animated span, notSVG. Corrected8 progression
cases retain exact localized text and span visibility assertions. All original
failures/logs/traces remain preserved; no product failure inferred from them.

Final current-e15-preserving dirty prototype12PASS32.1s: error contrast
minimum11.7465:1, medium500/2pxmarker,24normal+narrow width states,
12keyboard focus/indicator samples, no document overflow. Eight accepted
originals reviewed:6dark desktop/mobile(all3routes) and2explicit software
contrast(.75)/brightness(.8)/grayscale frames. An initial desktoplogin image
was blank: retained/excluded, replaced by the actual settled original after
fonts/two animation frames. This is fixture/software evidence, not cleanNix
or a deployment. Sourceproof confirms3classreplacements/currentSDK and
OAuthShell retained. Corrected progression8PASS23.1s.
