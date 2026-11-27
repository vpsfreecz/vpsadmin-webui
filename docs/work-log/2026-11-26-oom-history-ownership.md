# Preserve the browser history destination during OOM normalization

Requirements: REQ-010, REQ-048, REQ-060.

Original cumulative a93 mobile-WebKit shard3 retained one first-attempt failure: after browser Back the address bar had cgroup=/system.slice while the OOM chip still showed /history-two.slice. The job subsequently passed on retry, so its green conclusion did not qualify that source. Original job140132604568, log and54MB artifact15149459381 are retained with verified SHA2565e921512cdb2d00318038411cf5cfcf8c5dd44cd1c640d328b36f04e1f5500cc. No preview was activated.

Automatic pagination/filter normalization can run from a committed render while browser history has already moved to another search. Such outgoing writes must not replace the newer browser destination before React Router publishes it. Add an opt-in committed-search ownership check to automatic keyset normalization and supply it for OOM. OOM filter replacement also checks its actual pathname/search before writing. Explicit Next/Previous/page-size navigation still uses applied filters while router publication is pending; other callers retain their existing contract. Preserve preview-specific cursor reset on filter edits.

A deterministic regression reproduces an outgoing automatic replacement while the browser search is ahead: old code fails (1fail17pass), guarded code passes all18focused pagination/semantics cases and retains subsequent explicit Next. This proves the unsafe write independently; it does not claim a WebKit engine root cause. The original browser normalization, exact API fields, chip/list state, cached Back/Forward and no-extra-GET assertions remain. No waits, retries, skips or budgets are added. The successor must pass exact quick/relevant tests/build, local reproducible artifacts, repeated original lookup/history scenarios and every final hosted check/log before paired promotion; real served-dev acceptance follows.

Prepared as bounded integration/CI repair in existing336; no main merge, production/API activation or builder access. Previous complete physical local baselines remain separate from focused successor checks.

## Atomic applied-filter follow-up

Repeated original browser coverage passed9approved-source cases but reproduced additional cumulative-source failures while applying the second filter. The preview's existing explicit cursor reset was racing automatic keyset signature normalization, which could publish the previous committed filters before the caller's draft replacement. Preserve the useful cursor reset and defer opt-in automatic URL writes while applied parameters differ from committed parameters. Reset local pagination immediately so the new query starts at page1; the caller publishes the new filters and cleared cursor atomically. Align approved OOM replacement with that contract. Explicit navigation remains unchanged.

A second regression fails against the partial guard (1fail18pass), then all19pagination/semantics cases pass after atomic ownership. It checks reset local cursor, absence of a stale URL write, publication of the new filter and a subsequent Next preserving it. Original failed local repeated-browser evidence is retained and supersedes claims that the first ownership guard alone resolved the full cumulative case. Final exact-source qualification remains pending.
