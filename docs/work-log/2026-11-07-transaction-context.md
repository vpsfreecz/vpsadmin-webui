# Open a relevant transaction step in context

ACT-02 from the approved TODO series, linked to REQ-051. The first page of
the transaction item list scoped to a chain now opens one relevant step.
Failed, unfinished and other steps are considered in that order. Direct
links to individual steps and manually opening other details still work.

The change uses the data in the same scoped API response. The pinned
vpsAdmin API excludes input and output from member responses. Synthetic
browser coverage checks the initial expansion and the existing controls.
