# Default deployment scope: our PRs only

The maintainer explicitly requested that releases contain only our work unless
other contributors' PRs are explicitly included. Recorded this in AGENTS.md and
the operations guide, covering both web and WebUI channels. "Everything" and
"latest" remain bounded by that selection. Check the newly introduced commits
between the running and candidate revisions; do not blindly follow current main
or infer ownership from a branch prefix. Existing deployed changes are not to be
removed, and shared history is not to be rewritten.

This is an instructions/documentation change only. No merge or deployment was
performed. The main local checkout also has the instruction so it applies
immediately; its pre-existing edits were preserved and excluded from this PR.
Validation: documentation audit and git diff whitespace check.
