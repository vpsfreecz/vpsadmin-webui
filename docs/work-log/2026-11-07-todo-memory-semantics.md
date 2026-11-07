# Memory usage and confirmed OOM evidence

Approved VPS-12, proposal 6ea507225618c4e9. Remove the RAM-high ratio warning
from rows, cards and the detail header. Report RAM values neutrally, preserving
disk and operational warnings. Missing or invalid memory telemetry cannot be
shown as measured zero. Do not estimate available memory, cache or pressure
from the API's used_memory and memory fields.

Show a dated OOM warning only for a valid event within the last 24 hours. The
list makes one bounded query for up to 100 recent reports, respecting admin
owner/My-view filters; ordinary accounts rely on API ownership authorization.
Detail uses the VPS filter and one report. Render only matching VPS IDs. A
minute clock expires cached evidence during API failures; missing, future and
invalid timestamps do not qualify. Links show event time and open the report,
without mutations. An empty or truncated response is not proof of health.
No API, dependency, permission, retention or confirmation changes. Existing
PR179 overview diagnostics are retained in the cumulative preview and are not
duplicated into this focused topic.

Terminology: locked vpsadmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff; both
localization guides read. Effective dev API 22adc8b5 exposes used memory and
OOM created_at/since, without pressure/cache inputs for this decision. API
source inspection is not a new authorization audit. External KB workflow is
unavailable; fixtures cannot certify its captures. Validation/deployment
evidence follows after execution; this is not merge or production approval.

The older focused-topic baseline lacked the date formatter's optional language
argument. Add that backward-compatible parameter and a locale regression test
here. The cumulative preview already has this API and does not receive another
copy of the compatibility change. The first CI typecheck caught this baseline
difference after the last language refinement; fresh topic CI is required.
The focused baseline uses an inline hostname link rather than the cumulative
preview's stretched link. Its mobile regression checks that the full hostname
stays on one line, without requiring an arbitrary stretched-link width.
