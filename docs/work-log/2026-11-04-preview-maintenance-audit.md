# Preview maintenance and regression checks

Split the admin user payments page along its existing boundaries. Payment
history owns its queries and pagination, payment instructions own their
lazy query, and review content is separate from submission and retry guards.
The existing history capability fallback and query invalidation keys remain
shared by the same callers. Remove the retired structural exception.

Update the VPS pagination test for neutral stopped instances and the advisory
test to assert the CVE link destination. Reuse the compact admin-switch label
in the search reminder to avoid wrapping in the narrow sidebar.

REQ-004, REQ-052 and REQ-074. Test evidence distinguishes browser fixtures from
the live development API and OAuth checks.
