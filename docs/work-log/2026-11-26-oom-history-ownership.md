# Preserve the browser history destination during OOM normalization

Requirements: REQ-010, REQ-048, REQ-060.

Original cumulative a93 mobile-WebKit shard3 retained one first-attempt failure: after browser Back the address bar had cgroup=/system.slice while the OOM chip still showed /history-two.slice. The job subsequently passed on retry, so its green conclusion did not qualify that source. Original job140132604568, log and54MB artifact15149459381 are retained with verified SHA2565e921512cdb2d00318038411cf5cfcf8c5dd44cd1c640d328b36f04e1f5500cc. No preview was activated.

Automatic pagination/filter normalization can run from a committed render while browser history has already moved to another search. Such outgoing writes must not replace the newer browser destination before React Router publishes it. Add an opt-in committed-search ownership check to automatic keyset normalization and supply it for OOM. OOM filter replacement also checks its actual pathname/search before writing. Explicit Next/Previous/page-size navigation still uses applied filters while router publication is pending; other callers retain their existing contract. Preserve preview-specific cursor reset on filter edits.

A deterministic regression reproduces an outgoing automatic replacement while the browser search is ahead: old code fails (1fail17pass), guarded code passes all18focused pagination/semantics cases and retains subsequent explicit Next. This proves the unsafe write independently; it does not claim a WebKit engine root cause. The original browser normalization, exact API fields, chip/list state, cached Back/Forward and no-extra-GET assertions remain. No waits, retries, skips or budgets are added. The successor must pass exact quick/relevant tests/build, local reproducible artifacts, repeated original lookup/history scenarios and every final hosted check/log before paired promotion; real served-dev acceptance follows.

Prepared as bounded integration/CI repair in existing336; no main merge, production/API activation or builder access. Previous complete physical local baselines remain separate from focused successor checks.
