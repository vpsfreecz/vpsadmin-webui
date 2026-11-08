# VPS interface IPv6 wrapping — 2026-11-08

UX-03 / REQ-010, REQ-050. On a 320px viewport, a valid full IPv6 address in the mobile network-interface card extended the document to323px in Chromium and mobileWebKit. The inline monospace address had no wrapping opportunity. Add only `break-all` to that address; retain the complete value, interface/status/role gates, API queries and mutations. Other address cards already have explicit wrapping.

Private current991 smoke4 cases failed the actual 320px containment check; a separate two-browser diagnostic identifies exactly the inline address at x50/right323. Original logs, actual frames and observations remain in the private network-presentation task. This is a distinct card defect; existing network-status/traffic/routes PRs do not carry an interface-address wrapping fix.

The existing network browser suite adds valid long IPv6 fixtures and checks normal and320px containment and full visible address text in both languages/engines. A bounded four-cohort presentation audit separately exercises role/mode dialogs without confirming operations. Results and preview activation remain pending until exact packages, public CI and guarded paired release complete. All presentation/API data are intercepted fixtures, not live permission, quota, physicalSafari/display or whole-application certification. UX03/04 remain partial.
