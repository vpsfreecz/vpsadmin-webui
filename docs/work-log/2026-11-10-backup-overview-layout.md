# Keep backup actions above compact statistics

Approved BAK-01/258ecb55e6f40105 and BAK-02/2bc6b7679cff1253, REQ-009/010.
Place the three existing overview actions directly after the backup tabs.
Remove the introductory sentence and quick-action heading in both languages
because the tabs and buttons already explain their purpose.

Keep the five statistics and their scope explanations. A compact card places
the label beside the value where space allows and wraps at narrow widths.
Existing queries, scope warnings, counts, actions and destinations are
preserved. No global component or style changes are required.

Terminology was checked against locked vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. KB contracts at
`f97785c2c265172a4c78893e0673034fde56e4dd` bind backup captures to legacy
PHP routes. This React overview does not change those controls or captures.

Pinned quick checks, production build and 16 backup center unit cases pass
in both source variants. Four final desktop/mobile and Czech/English
Playwright cases pass per source with five contained label/value rows and
all three destinations exercised. Four matched baseline captures and
candidate captures use intercepted fixtures and the same route and viewport.
