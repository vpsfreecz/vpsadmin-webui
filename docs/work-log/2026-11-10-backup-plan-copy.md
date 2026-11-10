# Clarify backup plan ownership and removal

Approved BAK-11/2ea1e08edee52e97 and BAK-12/346a3aaf032447ba, REQ-009.
Both plan views identify administrators as the people who configure backup
plans. Individual plan descriptions continue to show the specific rules.

The read-only API source at `22adc8b54d464e0f899550746b69181930da80fd`
restricts DatasetPlan removal to the owner when the environment plan permits
user removal. Administrators bypass that plan restriction. Use explicit
owner and administrator wording while preserving the existing API, object
state check, busy gate, roles, confirmation and request.

Terminology uses the locked vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. KB contract revision
`f97785c2c265172a4c78893e0673034fde56e4dd` documents legacy PHP backup
routes and does not bind these React plan descriptions.

Pinned quick checks, six focused unit cases and production builds pass on
both variants. A private bilingual Playwright cohort exercises the existing
permitted and restricted cases in three browser projects. Desktop and
320px mobile paths preserve descriptions, containment and confirmation.
The inspected API source and intercepted fixtures verify distinct layers.
