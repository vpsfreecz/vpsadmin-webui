# Browser wire expectations after HaveAPI adoption

Original main run41291251937, attempt1 at163ad4e0, ended with two desktop broad
smoke failures. Retained trace evidence showed a successful member DELETE with
an empty vps namespace, and successful token-filtered session GETs using literal
query brackets. The tests still expected a bare empty object and percent-encoded
brackets. Original smoke run41291251986 also failed the lifecycle deletion body
assertion and a transaction dispatch-location recorder that patched only fetch.
The actual accepted transport is XHR. Original failures and configured retry
traces remain evidence; the successful observed requests do not prove dispatch
ordering.

Both member-delete assertions now require exactly the empty vps namespace,
retaining confirmation, member-option absence and row-navigation assertions.
The profile waiter matches GET and exact API collection path, then compares the
decoded user_session[auth_type] category through URLSearchParams. It is registered
before selection; filtered rows, exact ID, rename and close assertions remain.

The transaction spec records method/URL metadata only after native XHR open
succeeds. Immediately before a matching native send, it synchronously captures
the browser URL. The local wrappers forward this, all arguments, results and
exceptions without issuing or intercepting requests. They match GET, the exact
transaction-chain collection path, decoded limit51 and absent session filter.
Positive actual-request and recorder counts remain required, and every recorded
location must lack the invalid browser user_session parameter. Existing filter,
link and row assertions remain intact. No application observer is introduced.

Both complete profile specs are adopted into the existing strict E2E type gate,
removing their deferred entries. VPS row navigation and lifecycle were already
adopted. Local fixture index/nullability annotations preserve data and runtime
behavior. Requirements REQ-021, REQ-046, REQ-061 and REQ-064 retain their contracts.
No timeout, retry count, production serializer or API contract changes.

Static/type/coverage/documentation checks precede committed independent review.
After review, one focused batch covers both complete original affected files
on Chromium, all three transaction-filter cases on Chromium/mobile Chrome and
the lifecycle member-delete case on Chromium, two workers and retries disabled.
These intercepted synthetic API fixtures do not establish live backend permissions,
actual mutations or deployment acceptance. No production, dependency, BFF,
workflow, schema or persisted-format change is included.
