@'
# 402 Payment Required (h402 challenge)

When a request cannot proceed because **payment has not yet settled**, the
SCRAP Portal responds with:

- **HTTP status:** `402 Payment Required`
- **A machine-readable payment challenge** in `WWW-Authenticate`
- **A structured JSON body** that mirrors the challenge

This supports:
- autonomous agents
- humans-in-the-loop
- mixed agent/human workflows

---

## The 402 challenge model

The 402 challenge is intentionally analogous to HTTP auth challenges:

- `401` → `WWW-Authenticate: Bearer …`
- `402` → `WWW-Authenticate: h402 …`

The header tells an agent:

> “You may proceed once this payment condition is satisfied.”

---

## h402 challenge header

Example:

WWW-Authenticate: h402 realm="SCRAP",
checkout_url="https%3A%2F%2Fbtcpay.example.com%2Fi%2FABC",
invoice_id="ABC",
session_id="uuid",
amount="0.00001000",
currency="BTC"

### Parameters

- **realm**  
  Logical service boundary. For SCRAP this is `"SCRAP"`.

- **checkout_url**  
  Hosted invoice URL (URL-encoded for header safety).  
  Can be opened by humans or paid by automated agents.

- **invoice_id**  
  Stable identifier for reconciliation, audit, and logging.

- **session_id**  
  Continuity token. MUST be preserved and reused on retry.

- **amount / currency**  
  Price clarity only. The invoice remains authoritative.

---

## JSON body (mirrors header)

```json
{
  "detail": {
    "error": "payment_required",
    "code": "not_settled",
    "session_id": "...",
    "invoice_id": "...",
    "checkout_url": "...",
    "invoice": {
      "amount": "...",
      "currency": "...",
      "expected_total_sats": 1000
    },
    "retry": {
      "hint": "Pay the invoice, then retry the same request."
    }
  }
}