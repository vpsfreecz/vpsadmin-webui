# Selected-owner validation feedback — 2026-11-11

Approved UX-03/04 continuation, REQ-010; both broad tasks remain partial.
The finite actual731 Resources audit found required-choice text at3.12147:1
in dark forms, including pending/rejected phases after selecting valid values.
The clean6d Overview feedback smoke independently found the same measured
contrast in the password-mismatch message. Original negative logs remain.

Use readable foreground text, medium weight and a separate danger border in
these two existing messages. Preserve the password status semantics and announce
package validation as an alert. Clear the local validation flag
when either required selector changes, following the existing account-editor
pattern. Server errors, selected values, Create/Delete/password payloads, roles,
confirmation, pending and uncertain locks remain unchanged. No translation,
API, SDK, BFF or deployment configuration change.

This is separate from datePR280. The focused branch uses the experiment base;
the cumulative candidate starts at6d5a7e12 and must retain its date fix and all
actual731 changes. Existing SSH/DNS/monitoring validation PRs address different
components and remain untouched. Exact-lock dependencies are reused locally;
clean Nix remains a separate gate. No new mirror unit test is added for class
changes; rerun the existing rendered finite matrices and mutation contracts.

Implementation is prepared. Source checks, fresh measured browser results,
clean packages, exact focused CI and paired/result delivery remain pending.
No component or broad task is accepted by this work-log entry.

The complete baseline Overview audit now records28 configurations,152 states,
456 width probes/408 available keyboard indicators and6360 text samples on
clean6d:26 pass and2 real dark password-mismatch failures. Resources24 remains
20 pass/4 real failures on actual731. All original negatives are retained.

Both exact-lock source variants pass pinned ci:quick and production builds.
The working52-case cumulative and12-case focused browser checks are queued
behind the existing shared browser lease; they are not passing evidence yet.
The draft may be reviewed while these checks, new clean Nix, exact-head CI and
paired delivery remain pending. No stage/activation or broad completion claim.
