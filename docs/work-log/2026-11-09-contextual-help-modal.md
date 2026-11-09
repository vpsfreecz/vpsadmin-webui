# Contextual page help in the shared modal — 2026-11-09

REQ-053/054. The maintainer requested replacing the page-wide help panel with
one small icon beside the primary heading, shown only when help is available.
This supersedes the presentation in [UX-05 help placement](2026-11-07-todo-help-position.md).
The live help page/action resolver, view query, public/authenticated executor,
ordered HTML and existing management capability/filter route are unchanged.

The shell supplies one shared heading registry. List and object headers and
standalone public headings use the same anchor; an existing read error can
host it when the normal title cannot render. Only the primary anchor receives
the button. Public idle loading is retained and formerly clipped public titles
are shown with their icon only when there is help. Console routes stay exempt.
Opening or closing help does not move or remount the page content.

Use the existing large centered Modal, native tooltip, localized accessible
name, 44px coarse target, body scroll and focus restoration. A fixed footer
Close also keeps the normal Tab sequence through sandboxed HTML links. The
script-free iframe, CSP, original formatting and hrefs remain intact; resize
the document to its content and forward Escape from its own document to the
owning dialog. The existing permission gate exposes Manage help boxes inside
the dialog without changing any management capability.

Remove the obsolete Top/Bottom controls and four labels from both catalogs.
Keep the stored legacy values for rollback; they do not reopen or reposition
this dialog. Terminology guide: locked vpsadmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The separate KB contract targets
legacy PHP vpsadmin; its registered pages and captures do not bind this React
help control. No backend pin, KB prose, capture runtime or publication changed.

Prepared source. The first lint run correctly requested adoption of five
new/changed eligible shared files; the same checks pass after adoption and
formatting. Seventeen focused component tests, source quick checks, 2354 unit tests, 244
script tests, 58 BFF tests and build passed. The initial prototype had 15/20
passes: five mobile WebKit cases did not receive Escape from script-free
iframe links. A native event diagnostic confirmed focus inside the link with
no keydown delivered to either document or window. Chromium forwards Escape
from the frame; in WebKit, Tab reaches the dialog controls and Escape works
there, with focus restoration. The sandbox is unchanged. Local regression
uses the full role/locale/theme matrix; PR smoke keeps representatives per
surface and the relevant edge cases. Immutable package, actual preview and
CI outcomes are recorded when completed. This
change is not a new authorization to merge or deploy on newadmin.
