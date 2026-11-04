# NAV-01 session length dialog

The maintainer requested direct editing from the remaining time control.
A modal keeps the current screen available and offers 20 minutes, 40 minutes,
no expiry, and a custom value. Save writes only the session length of the
signed-in account using the existing user update. Cancel discards the draft.
The profile security route remains available.

REQ-006. Czech terminology input is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Browser fixtures cover opening,
presets, custom input, cancellation and the request on explicit Save.

## Anchored panel follow-up

The countdown opens a panel anchored to the navigation controls, matching
the account menu surface. Escape and Cancel close it and return focus.
