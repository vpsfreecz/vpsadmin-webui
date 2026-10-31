# Explain incident policy periods and report associations

The maintainer requested clear periods, counts, limits and actions, with separate
navigation for incident reports and incident policies (REQ-051). The policy route
is unchanged. A reports tab opens the existing filtered list with app/admin and
owner context, without a new route or API.

Current policy rows and saved evaluation rows share a four-column view. Callers
supply each fact; current limits never fill gaps in historical data. Report detail
uses explicit saved membership and never infers it from a codename. Active
policy links require the authorized included VPS and a key in the runtime
registry; retired keys retain scoped history. Member sections require `matched=true` and state `recorded` or
`audit_only`. Nonmatches, missing membership and error states remain distinct in
administrator diagnostics. An evaluation error does not erase saved membership
or change backend counting. Generated notices identify their saved originating
action policy. Lists make no request per row, and the UI adds no enforcement
action.

The typed implementation uses SDK artifact
`2d251bb0e10f5379a19df3a07eb7a0b0f19e3c88`, packed source
`44c651b2a57e8de553dd51236c2dccbc09946fac`, generated from backend
`de4df3d63f4d4afb0c27e8b9be2785c15d24811c` and schema SHA-256
`7cb28ebd8e0957d9a8ba2c359c8658040ed1cd195f0dd14327c03b595012fc85`.
The independently verified archive is 345048 bytes, SHA-256
`983061ec981e24e45c25abeef81d8049d4253bad4d473ea37d5ce27ff0a1b718`.
Installation through pinned npm passed, and all 1382 installed archive files
match. The lock changed only the root dependency and generated SDK record. The
runtime peer, its version and the BFF dependency graph are unchanged; no generated
shim was added.

Draft presentation, navigation and link tests passed three files and 15 tests.
Draft API-boundary checks passed two files and 23 tests; locale and documentation
audits also passed. Application typechecking against the final SDK passed. The
original nine-file test run passed 86 tests and failed two EN/CS retired-history
link assertions; eight files passed and one failed. The batch stopped there,
leaving 11 commands unrun. A minimal JSDOM control reproduced a failed selector
lookup for an existing link. The test now compares the complete ordered array of
five destinations, and the affected file passes all nine tests. Runtime code is
unchanged by that assertion correction.

The narrow typecheck initially omitted the repository's existing ambient Window
declaration from its temporary config. Including that declaration made the
affected typecheck pass. E2E core typechecking passed. Lint then rejected four
arbitrary column widths; replacing those classes with standard quarter-width
utilities passed lint without changing the table's facts or actions. Original
failure logs are retained separately. The remaining format, localization,
structural, component, UI-string and mutation audits, production asset build and
dependency prefetch all passed. The actual prefetch hash updates the frontend
cache input; six optional WASI-cache warnings remain subject to the later Nix
package build. These cumulative results cover the final SDK and focused tests;
they are not a full unit or browser-suite claim.

The previous `b1fb` source/package, hosted checks, demo and captures retain their
original inputs. Scoped browser and immutable package verification follow final
committed independent review. This WebUI change has not been deployed, published
or merged, and no demo or registry release is claimed.

The locked terminology revision is vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The lead supplied the final four column
labels, action categories, navigation labels and three neutral messages for
links, history and unavailable data. Existing error and mail semantics are
preserved. A published generated SDK registry artifact remains required before
WebUI merge.
