# Consistent NAS form controls

NAS-12, NAS-13 and UX-08 address inconsistent label gaps, advanced-property
disclosures and primary-action placement in dataset forms (REQ-010/REQ-048).
Standalone fields already used a four-pixel label gap and semibold label;
management and child-create fields used no gap and medium weight. Two flex
summaries hid their native marker, while standalone retained a different
marker. Management and standalone confirmations were left-aligned.

Use one native details/summary component for all three advanced-property
groups, with a visible chevron, keyboard focus and a 44-pixel minimum target.
Keep controlled/uncontrolled open state and each existing onToggle callback.
Match label spacing and weight to shared Input/Select. Put confirmation on
the right and order standalone Cancel before Create. The child dialog is
the reference. The adjacent inline expansion form now places its existing
explanation before its unchanged primary action, matching related dialogs.

No payload, validation, ownership, role, query, action guard, draft or default
collapse rule changes. Opening creation properties still opts those values
into the payload; merely opening management properties does not mark them
dirty. An untouched blank quota remains omitted, whereas an explicitly
entered zero is sent as zero. NAS-05/NAS-14 model choices are unchanged.
The existing 697-line structural allowance is retained; only the reviewed
footer content hash/rationale is refreshed, with all other exceptions intact.

The strict adopted Playwright root covers 50 scenarios in each of Chromium,
mobile Chrome and mobile WebKit: member, admin, admin in My context and
support in My context; support-All negative gates; Czech dark and English
light; native/320-pixel widths; gaps, alignment, 36/44-pixel fields, primary
placement, actual Tab order, Enter/Space/touch disclosure, effective CSS
rotation and draft retention. Rejected intercepted requests verify existing
properties and local lock release without live API writes. Related snapshot
and expansion inline/register/edit/add-space footers follow the same rule.

Validation at this commit: 150 raw Vite cases pass with zero Playwright
retries, failures or skips; pinned quick/build passes both source trees and
the new E2E root is strictly adopted without changing deferred baselines.
A separate 13-case diagnostic also passes. Initial observer/quota expectation
errors and interrupted runs remain in external evidence, not counted as
final passes. The CSS observer includes Tailwind 4's independent rotate
property. Private raw-runner artifacts were moved outside the watched source
after traces proved they caused Tailwind/HMR feedback; the repository's
standard e2e/test-results path is already ignored. Initial management-root
readiness has a bounded 30-second wait; mutation and layout criteria stay
strict. This is fixture evidence, not live permissions or physical Safari.

Existing localization and locked vpsAdmin terminology guides were reviewed;
no new translation key or term is introduced. Both locales retain their
existing ZFS captions. Current KB create/edit/mount capture contracts bind
legacy PHP rather than React, so no unrelated legacy capture pin is changed.
API/PHP remain untouched. Clean integration packages, exact focused CI,
matching screenshots, paired previews and protected result publication are
independent requirements before delivery; no merge or production promotion.
