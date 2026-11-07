# Export list filter dimensions

Continue approved UX-03 (proposal 7c773db80dfa673c) with a local correction
to /app/exports and /admin/exports. Desktop search is 44px high, help and
copy-link are 32px, and clear/refresh are 36px. Match those four controls to
44px and use the standard filter button typography; keep help square. Mobile
already has minimum touch sizes and continues to wrap without overflow.

No wording, API, dependency, permission, owner-scope, smart syntax, URL,
pagination, export mutation, global control or held DNS changes. Existing
export contract checks remain authoritative. UX-03 remains partial.

Verification uses the same synthetic fixtures before and after, CS dark and
EN light, member and global administrator, Chromium and mobile WebKit. Check
geometry, local invalid-filter chips, owner query scope, keyboard help and
focus restoration, exact URL copy, refresh and clear. Initial UI preference
persistence may occur in the mock; export mutations must not occur. Physical
Safari and live API authorization are outside this local CSS scope. Exact
package, CI and paired activation outcomes will be recorded after execution;
this is not a claim of production deployment.

Local results before packaging: both branches pass ci:quick and 19 existing
export model/semantics unit tests. The unchanged baseline and changed working
preview each pass 8 Chromium/mobile WebKit scenarios (CS dark / EN light,
member/admin). The new checks cover rendered dimensions and retained behavior,
including invalid-token chips, owner scope, keyboard help/focus return, exact
link copy, refresh and clear. The first quick check required formatting the
explicit E2E TypeScript file list; no product behavior or assertion was changed.
The broader export contract run, clean package verification, public CI and
paired deployment remain separate gates and are reported after completion.

Visual review also found the administrator owner lookup at 36px beside the
44px field. A local descendant class makes that input 44px without changing
the shared lookup component. The focused browser check covers its height;
existing owner lookup focus/filter contract checks remain unchanged.

The owner-input follow-up passes ci:quick on both branches and eight revised
working Chromium/mobile WebKit checks; eight repeated baseline checks confirm
the old owner height. The previous four-control package was staged but never
activated. Preserve its artifacts; the final source needs new clean packages
and fresh CI on the new head. No unit model logic changed in this follow-up.
