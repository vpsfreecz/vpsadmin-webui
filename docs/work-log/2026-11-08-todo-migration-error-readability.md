# Readable migration-plan read errors

UX-04 `d5847413b2b70eae`, REQ-009/010/028. The approved bounded audit
found that migration-row and destination-node read failures use small danger
text on the normal dark card. The row error is hard to distinguish in the
recorded software contrast simulation. Use the existing danger Alert, readable
body text and localized Error/Chyba heading for both independent read failures.

Existing badge/reference/node-label helpers move unchanged into a small
presentation module so the already large route shrinks. Remove its resolved
structural-growth exception; no budget or baseline increase. Adopt the complete
existing migration action-feedback spec into strict TypeScript coverage while
adding both-language/theme/admin-support read-error checks to PR smoke.
The immutable deferred-source baseline is unchanged.

Only presentation changes. Keep the destination selector disabled on errors,
retain the error details and preserve all query, role, lock, scheduling and
mutation contracts. Verification errors in the shared administrator recovery
warning use readable foreground text and medium weight; preserve their exact
message, generation review/verification, acknowledgement and safety lock.
This shared presentation also applies to existing node recovery.

Terminology source: locked vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; existing bilingual labels reused.
No labels, routes, API adapters or KB member landmarks are added or removed.
The legacy PHP KB source and member screenshot concepts are unaffected by these
admin React read-error panels; no external KB publication is implied.

Prepared for focused draft review. Local source/browser, exact-head CI, clean
Nix provenance and paired-preview checks remain pending. Fixtures certify only
listed presentation states, not live permissions, OAuth, physical Safari, a
weaker physical display or WCAG conformance. The broad UX-03/04 audit remains
partial until its finite acceptance matrix is closed. No merge or production
activation.
