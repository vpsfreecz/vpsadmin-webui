# Public overview IPv4 availability

The maintainer requested removing the low IPv4 pool banner from the
anonymous public overview. Visitors cannot manage the pool. The existing
VPS statistic continues to display available IPv4 addresses and their
severity. Outages and session notices are handled independently.

REQ-054. Czech terminology input is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The existing public Playwright
scenario checks the counter and absence of the banner with ten addresses.
The preview comparison uses synthetic data and the exact packaged builds.

## VPS statistic follow-up

The maintainer also requested removing the available IPv4 count from the VPS
card. The card shows the VPS total. The public API response still supplies its
existing fields. The browser scenario uses ten free addresses and verifies
that only the VPS total appears in the card.
