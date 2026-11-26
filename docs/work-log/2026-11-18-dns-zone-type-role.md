# Separate DNS zone type and authoritative role — 2026-11-18

DNS-01 / REQ-049. The maintainer delegated pending choices. Choose type for
forward/reverse zones and role for primary/secondary authority,consistently
across CS/EN list,detail and creation. Keep the API's historical role/source
identifiers unchanged. Derive authority from known source/secondary-type
metadata; do not invent primary authority for missing/future sources.

The list groups both labelled values in its existing type cell rather than
adding a new table column. Detail uses labelled type and authority badges;
creation names its primary/secondary selection Zone role and explains the
independent concepts. Source filters,role filters,API payloads and transfer
peer direction are unchanged; no held DNS API/SDK work is incorporated.

Locked terminology: vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff,
both localization guides reviewed; use Dopředná zóna for Forward zone.
The existing primary/secondary descriptions remain contextual help. No new
external wiki URL or legacy KB freshness is claimed without a reviewed target.

Validation,required CI and paired preview delivery are pending separately.
Browser coverage uses isolated API/session fixtures,not real DNS changes.
