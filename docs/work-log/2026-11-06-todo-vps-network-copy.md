# Compact address copying in the VPS overview

TODO NET-02 comes from [Discourse #19](https://discourse.vpsfree.cz/t/372/19).
The original feedback concerns the VPS overview network card. The dedicated
Network tab has a separate route and host address workflow.

The address remains selectable text. An adjacent icon copies the full
displayed address and prefix with keyboard and touch activation, keeping the
existing success and failure feedback. The clipboard fallback removes its
temporary input on failure and restores the selection and focus it displaced.
Labels reuse the English and Czech catalog at vpsAdmin terminology revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
