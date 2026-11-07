# Separate language and appearance from the account menu

The signed-in navigation has a dedicated settings button beside the login.
It opens a viewport-bounded panel with the existing theme and language
controls. The account menu retains scope selection for eligible accounts,
profile, public status and logout. Only one panel opens at a time. Escape
closes it and returns focus to its own button.

Applies to the expanded sidebar and the mobile drawer. Preference storage and
authorization remain as before. Terminology checked against vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
