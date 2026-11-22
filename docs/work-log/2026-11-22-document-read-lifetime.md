# Retire reads with their document

Requirement: REQ-046; preserve REQ-011 mutation uncertainty. During the
maintainer-requested acceptance audit, Linux mobile WebKit reported XHR
access-control errors during rapid full-document IP/dashboard navigation.
Original intercepted mobile run: five strict page-error failures, with the
functional UI assertions passing. The complete mobile scope remains1177 cases;
the partial run was interrupted for native diagnosis and its unexecuted cases
are not valid skips.

A new disposable dev administrator reproduced real API failures: Chromium ten
IP/filter read loops passed with no errors; WebKit ten loops produced four
IP-address XHR errors. All ten HelpBox replies per engine were HTTP200. There
was no API-response interception or financial/resource mutation. The account
was disabled, its password removed and sessions revoked after the test. Three
unchanged isolated repetitions of the original fixture case passed, so those
repetitions do not erase the native failure.

The first pagehide-only prototype did not fix the problem. A controlled native
WebKit comparison retained six baseline errors and three prototype errors.
Instrumentation matched all errors to GET sends13–42ms after beforeunload but
before pagehide, confirming why pagehide alone was too late.

Revised prepared change: bind GET/OPTIONS cancellation from beforeunload beneath
the generated executor, stop late reads before XHR dispatch and keep the hidden
barrier through pagehide. Pageshow creates a fresh lifetime. Trusted foreground
activation can resume a cancelled departure only while the document is not
hidden; synthetic focus/click cannot reopen it. Compose, then release, the caller signal without aborting its parent.
Already-submitted mutation requests remain in flight, even when they share a
caller signal with a read. Keep the installed generated SDK/HaveAPI transport,
headers, metadata, output receipts and uncertainty policy. No package/API/BFF or
localization change is required.

Status: the revised behavior is verified by the controlled prototype comparison
below. Final exact-head package, CI and deployment qualification remain pending.
This source does not record a merge or preview activation.

## Prototype verification

The revised dirty cumulative prototype used the unchanged real dev API and
OAuth provider, with only frontend static files and their version-index check
overlaid in the browser. Actual CSP headers were preserved. The baseline
WebKit repeated ten rapid reads with three page errors; revised WebKit and
Chromium each repeated ten without a page error. Both revised engines
cancelled a real beforeunload prompt and completed a subsequent IPv6 read
with HTTP200. Submitted-mutation independence is covered by the actual
HaveAPI-client regression, sharing a caller signal with the retired read.
The disposable administrator was disabled and its sessions revoked afterward.

This is prototype evidence, not a clean-package/deployment claim. Earlier
script/setup failures and the insufficient pagehide-only prototype remain
recorded separately. Exact clean checks, packages, CI and preview activation
will be recorded in the review/delivery receipts.
