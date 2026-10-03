# Registration response presets

## 2026-09-28 — Prepared for review

**Request / reason:** the maintainer approved common rejection/correction reasons
to avoid repeatedly typing applicant responses. Messages must follow the
application's Czech/English language, rather than the administrator's UI language.

**Change / decision:** individual registration review now offers four rejection
presets: nonexistent address, incorrectly completed application, duplicate
application, existing membership. The generic incorrect-application message is
complete and needs no additional explanation. Correction offers incomplete
address, unverifiable address, and missing/incomplete name. The unverifiable-address
message asks for a checked/corrected address and optionally a map link marking the
applicant's house. All seven presets have complete Czech and English wording.

The picker fills an editable message. Custom text remains available and is sent
unchanged; it is not automatically translated. Numeric language references use
the language catalog rather than hard-coded IDs. Unknown language requires an
explicit language choice for presets. Changing the correction language updates an
untouched preset, while retaining an edited reason. Existing preflight, state gates,
confirmation, mutation locks, reason limits and error handling remain in use.
No new email call or backend change is needed: the resolve API already stores the
reason and schedules the appropriate localized email. Account-change and bulk
review continue to use their existing free-text reasons.

**References:** [REQ-038](../design/REQUIREMENTS.md),
[workflow](../design/WORKFLOWS.md#applications-profile-changes-and-review-queues),
[message catalog](../../src/pages/app/admin/RegistrationReasonPresets.ts),
[browser cases](../../e2e/specs/admin/registration_reason_presets.spec.ts).

**Verification:** 88 request/preset unit and component tests passed (including
24 targeted preset/editor/review cases). All 10 new cs/en desktop/mobile fixture
browser cases passed. Existing review regressions passed on desktop (39 cases);
all 14 tagged mobile cases passed too. Lint, i18n and design-docs audits, typecheck and
production build passed. The build retains its existing chunk-size warning. Browser tests use only synthetic applicants and intercepted API calls;
they verify the exact submitted reason and existing error preservation, not email
delivery. No actual applicant was contacted.

**Status:** prepared on `codex/registration-reason-presets` from
`156a7c043e543b5f4a51fc962d16e31bd6eaa00f`; not merged or deployed.

**Next / limitations:** human review of wording and implementation, then an
authorized merge/release. Mail delivery remains the existing backend contract.

An initial broad invocation incorrectly ran desktop-only table assertions on the
mobile project and failed on the intentionally hidden desktop table before entering
the changed dialog. That invocation was stopped; the unchanged regression suite
was rerun as desktop plus its explicitly tagged mobile cases. No checks or
application behavior were relaxed to obtain passing results. Screenshots were
visually inspected with synthetic applicants in light/dark and desktop/mobile.

## 2026-10-03 — Transfer to the canonical repository

The maintainer requested moving [legacy PR529](https://github.com/Kerrycek/clankerdev/pull/529)
to `vpsfreecz/vpsadmin-webui`. Import original commit
`169ad7fac8d8daab8d6d96d1e561dd2877915f0e` on current canonical main `3f31fce`,
retaining authorship and feature scope. The workflow-document conflict retains
both the preset contract and the newer registration/account-change layout.
No old base history, issue-runner policy or other pending PR is included.

The new browser spec is adopted into strict E2E TypeScript coverage (21 checked
files, 225 deferred); no existing coverage hash, strictness or exception is
weakened. The declared wording is reviewed against the flake-resolved vpsAdmin
terminology/localization guides at `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
No PHP/API catalog regeneration applies to this React-only transfer. KB capture
and real mail delivery are not certified by its synthetic browser checks.

Fresh verification in an isolated Linux checkout used the locked Node
24.21.0/npm 11.19.0 toolchain and a clean `npm ci`. `npm run ci:pr` passed:
1,666 unit/component tests across 283 files, 222 script tests, 57 BFF tests,
strict type checks, lint, localization/design/security audits and the build.
All 10 preset Playwright cases passed across Chromium desktop/mobile, including
opposite admin/applicant languages, exact payloads and preserved rejected drafts.
The two captures below were visually checked. Further review-regression and
GitHub CI results belong in the new PR's validation record. The build retains
its existing large-chunk warning.

Prepared for review in the canonical repository; not merged or deployed.

Synthetic captures from the transferred implementation (no real applicant data):

- [Desktop: Czech applicant message with English admin UI](screenshots/registration-presets-desktop-cs.png).
- [Mobile: English applicant message with Czech admin UI](screenshots/registration-presets-mobile-en.png).

## Deployment follow-up — 2026-10-03

Merged and deployed to all three WebUI sites in clean release `f123a7fb`.
See the [completed release receipt](2026-10-03-three-site-release.md) for
exact provenance, CI results, runtime verification, rollback and limitations.
