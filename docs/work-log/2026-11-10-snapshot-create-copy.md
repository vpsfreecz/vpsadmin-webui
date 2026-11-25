# Describe the snapshot target before confirmation

Approved BAK-06/d62d1875248937fa, REQ-009. The snapshot creation
dialog describes the selected dataset in one sentence in Czech and English.
The action receipt and existing progress dialog continue to explain progress
after confirmation. Request fields, validation, roles and snapshot list
behavior are unchanged.

The locked vpsAdmin terminology input is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The new wording uses the
existing dataset label and the established snapshot and dataset terms.

The existing deep-link regression covers both languages and checks the
visible target dataset before any progress dialog opens. The existing
confirmation regression continues to verify the snapshot request and the
progress dialog for its returned action. These are intercepted API fixtures.

KB impact was reviewed against contracts revision
`f97785c2c265172a4c78893e0673034fde56e4dd`. Backup and restore captures
target the legacy PHP backup page. The React confirmation copy does not
change their control IDs, routes or captured text.

Pinned Node checks and production builds pass in both source variants.
The nine focused Playwright cases pass on each source variant across
Chromium, mobile Chromium and mobile WebKit with retries disabled.
