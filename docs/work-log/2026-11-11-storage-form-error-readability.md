# Readable mount lookup errors (prepared, 2026-11-11)

Approved UX03/04 versions7c773db80dfa673c/d5847413b2b70eae cover bounded storage
presentation. The current picker error uses small danger text measured3.121474:1
in dark mode. Its newer component is absent from mandatory13a; PR200 is already
merged/closed. Importing the whole picker or silently changing the base would
expand this repair.

Instead, give the existing MountFormFields wrapper local descendant styles for
its error text: normal foreground, medium weight and a separate2px danger border.
The stable form exists in both branches; this supports the earlier inline finder
and the already-active embedded picker. Only one local class value changes, no
global palette, test-ID selector, new picker feature, property, text, gate, query,
payload or dependency. Existing error text and semantic roles remain intact.

The strict adopted source regression exercises both real rendered implementations,
including normal/320px contrast/text/modal/document geometry, retained mount draft,
keyboard read recovery and exact original GET query parameters. All API responses
are intercepted; this is not live permissions or filesystem evidence. It is
explicitly selected in all three required browser profiles. Immutable debt,
compiler flags, retries and existing assertions remain unchanged.

Fresh actual67ad baseline16 fails on the targeted contrast/weight/marker criteria;
all16 recover by the original keyboard GET flow with retained draft and no writes.
Current dirty0ac2+patch16PASS and focused dirty13a+patch16PASS, retries0;32 samples
each, current nominal minimum11.746504:1 versus original3.121474:1, weight500 and
marker2px. The earlier finder and current picker keep their distinct original
query contracts. Both full ci:quick pass with lock-matched pinned dependency sets;
final capture-only extension is strictly typed. Actual selectors8 each across all
three profiles. Clean packaging, exact-head CI, finite current-storage survey
and paired/protected delivery remain pending. The cumulative work
starts on prepared approved NAS11 candidate0ac2, not an activated release; both
new focused heads must finish6SUCCESS/original0failedflaky before a combined
preview. Actual both previews remain67ad, and UX03/04 remainPARTIAL1.

Private evidence: /data/webui-browser-runner/verification-20261103/todo-storage-form-alert-compat-20261111.
REQ-009/010/048. No merge, approval, production/newadmin/API or human decision write.
