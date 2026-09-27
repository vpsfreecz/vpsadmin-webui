# Localization for vpsAdmin WebUI

This procedure applies to English and Czech TypeScript catalogs, visible source
strings, BFF error pages and early bootstrap messages. Read it before editing
their wording or behavior.

## Use the locked terminology guide

From the repository root, resolve the `vpsadmin` input and read its guide and
localization procedure:

```sh
vpsadmin_source=$(nix eval --raw --impure --expr \
  '(builtins.getFlake (toString ./.)).inputs.vpsadmin.outPath')
vpsadmin_revision=$(nix eval --raw --impure --expr \
  '(builtins.getFlake (toString ./.)).inputs.vpsadmin.rev')
printf 'vpsAdmin terminology revision: %s\n' "$vpsadmin_revision"
cat "$vpsadmin_source/docs/i18n-cs.md"
cat "$vpsadmin_source/docs/agent-instructions/localization.md"
```

Record `vpsadmin_revision` with the change. The repository's `flake.lock`
selects this source. When site configuration overrides the input, record that
effective revision separately and review terminology/API compatibility against
it. The [source guide](https://github.com/vpsfreecz/vpsadmin/blob/master/docs/i18n-cs.md)
is a pointer for readers, not a substitute for the locked version. If Nix cannot
resolve the input or a guide is missing, report the setup failure. Do not switch
silently to a sibling checkout or floating branch.

## Apply the guide here

Read both language variants in context. Keep the TypeScript keys, placeholders,
plural categories, URLs and technical identifiers consistent. Check rendered
messages and accessible labels, not only dictionary parity. Preserve the
distinction between graceful Shutdown/Vypnout and immediate
Poweroff/Vynutit vypnutí. API-provided transaction labels remain authoritative.

This repository uses TypeScript catalogs and Node BFF strings. The vpsAdmin
guide also describes PHP gettext and API YAML regeneration; those commands do
not apply here. Use this repository's `audit:i18n`, tests and rendered checks.
For member-facing text, follow the surrounding project voice and the applicable
vpsFree.cz writing and KB review process. A visible label or navigation change
may require an update in the separate KB contracts repository; fixture browser
tests alone do not establish that its pages or screenshots are current.
