# Distinguish route removal from returning an address — 2026-11-18

REQ-050 / NET-12. The maintainer explicitly requested completing the explanation.
My Network has a native disclosure describing the existing VPS Network / Free
route path, continued account ownership and contacting administrators to return
an owned allocation. The confirmation also states that ownership is unchanged.
No mutation, API permission, assignment, ownership or uncertainty logic changes.

Contract reviewed in running dev API22adc8b54d464e0f899550746b69181930da80fd:
IpAddress::Free authorizes the existing ownership/interface checks;
NetworkInterface::DelRoute clears interface/routing fields and preserves user_id.
Updating allocation ownership through IpAddress::Update is administrator-only.
An unassigned allocation is therefore not implicitly returned to another member.

Terminology: locked vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff;
both locked localization documents reviewed. The external KB contract pins
legacy PHP/API, with no React input; no unrelated KB pin or capture update.

Source prepared; exact focused checks, immutable package, original CI, paired
deployment and actual-dev proof are separate gates. New browser scenarios use
synthetic identities and intercepted API data; no real IP is disconnected.
