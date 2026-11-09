# Keep DNSSEC records inside narrow cards

The approved UX-03 dimensions audit found that unbroken DNSKEY and DS values
expanded the DNSSEC grid's minimum track width beyond the mobile viewport.
On clean preview cd204643 a synthetic 264-character public key produced a
1643px document at390px. Both language smoke cases failed the overflow guard;
the original screenshots and traces remain in the private audit record.

Set the two record grid items to min-width zero. Their existing preformatted
text containers can then scroll locally without expanding the card. Preserve
all text, source data, record order, role handling, query and clipboard values.
No API, BFF, dependency, localization or held DNS PR116/117 change is included.

REQ-010 applies. A strict browser regression covers CS/EN, light/dark, member
and administrator routes, 1440/390/320px, local scroll reach, keyboard focus,
exact complete DNSKEY and DS text and both intercepted clipboard writes.
Fixtures do not certify live DNS content, API permissions or physical Safari.

Source, browser, exact-head CI and clean package checks are pending. This is
prepared source only; no merge, deployment or broad UX-03/04 completion.
