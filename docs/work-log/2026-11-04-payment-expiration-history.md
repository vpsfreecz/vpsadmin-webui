# Manual paid-until changes in account payment history

The administrator account Payments tab (REQ-052) now refreshes its history
after saving the paid-until date. The API supplies the authenticated
administrator and both date values. The UI distinguishes this entry from a
payment and renders a dash for a missing amount or date.

The client checks the HaveAPI index action metadata before sending
`include_expiration_changes`. Hosts on an older API can keep using the
account payment list. The global finance ledger and member payment list use
the existing payment-only scope.

Czech terminology follows vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The regression scenario uses
fixture responses to check the history refresh and row contents.

The administrator incoming payment detail also shows the payer account returned
by the API. It displays a dash when the bank supplied no value or the payment
was imported before the field was stored. The payment list does not request it.
