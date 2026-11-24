# Generic incident policies: synthetic views of the implemented UI

Desktop English/admin and mobile Czech/owner, captured from the implemented
G2 draft on 2026-11-18. The source was dirty atop
`8ce6baac538061d5b51b84c09044947a22004435`; the sidebar revision and asterisk
reflect that capture origin, not a clean build or deployed revision. Exact source,
config and fixture hashes are retained in the development evidence. History
contains saved values; current policy limits come from the separate live rows.

| View | Current policies | Saved evaluation detail |
| --- | --- | --- |
| Desktop EN/admin | [Policies](desktop-en-admin-policies.png) | [History](desktop-en-admin-history.png) |
| Mobile CS/owner | [Policies](mobile-cs-owner-policies.png) | [History](mobile-cs-owner-history.png) |

The two scoped flows passed without retries. They cover the two-policy display
from API metadata, the threshold link, settings for each role, independent writes
for nullable inheritance and shared permission, scoped history navigation, a
saved label for a retired policy, and horizontal layout. The capture produced
four full-page PNGs; a passing run does not produce a trace.
All API data is synthetic, with missing IP addresses and resources and fixed timestamps.
The existing date formatter follows the fixture account/browser settings, so the
Czech catalog does not certify a Czech account date format. These images do not
prove live API authorization, engine execution, OAuth, SMTP or deployed behavior.

The lead viewed all four images and accepted the synthetic layout and copy for
these desktop and mobile views. Independent final review remains pending.
Historical selected-policy and dynamic captures remain in their original
directories and apply only to their stated source.
