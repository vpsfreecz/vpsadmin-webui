# Align created snapshot download actions

Approved TODO UX-03 (`7c773db80dfa673c`), REQ-048. The finite snapshot
presentation audit reproduced a 32px Download action beside 36px Downloads
and Close actions in the created-download dialog on a fine pointer. The same
mismatch occurs while the generated file is pending and after it is ready.

Allow the shared download action to accept the standard button size, keeping
its compact default for list rows. Select medium only in this dialog footer.
Existing link validation, pending-state disabling, action labels, new-tab
attributes and API calls stay intact. Coarse-pointer targets use the shared
44px minimum. This contains no translation or API-contract change.

The original clean preview `852cb318bc123a3b4d79a8ef966b78d7c5512474`
passed 40 fresh read-state fixture configurations across five role/mode
contexts and four dataset/NAS aliases, CS dark/EN light, desktop Chromium and
mobile WebKit. The added feedback fixture exposed the desktop mismatch;
mobile WebKit passed. Initial fixture assumptions about a query parameter,
resource label and starting viewport were corrected with diagnostics retained.
These are intercepted synthetic UI checks, not live permission or storage proof.

Implementation is prepared for focused draft review. Exact candidate checks,
CI and paired preview activation are recorded separately after they finish;
no merge or production release is authorized by this change.
