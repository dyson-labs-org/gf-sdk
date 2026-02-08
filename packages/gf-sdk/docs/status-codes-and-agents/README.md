# Status Codes and Agents

SCRAP is designed for **automation-first** usage.  
Agents should be able to move from:

request ? pay ? retry ? execute

using **standard HTTP semantics**, without out-of-band coordination.

In SCRAP, HTTP status codes are treated as **control signals**.
Agents SHOULD branch on the status code first, then parse headers and bodies
to determine the next action.

## Quick map

- **200 OK** — request succeeded
- **202 Accepted** — accepted, execution may complete asynchronously (future)
- **400 Bad Request** — invalid inputs (fix request)
- **401 Unauthorized** — missing or invalid authorization
- **402 Payment Required** — payment gate encountered (pay, then retry)
- **403 Forbidden** — authenticated but not permitted
- **404 Not Found** — resource/session/action does not exist
- **409 Conflict** — state conflict (often replay / already executed)
- **429 Too Many Requests** — throttled (retry with backoff)
- **5xx** — server error (retry with backoff)

## SCRAP conventions

- **Headers are primary.** Machine-readable challenges live in headers.
- **Bodies mirror headers.** JSON exists for debugging and non-header-aware clients.
- **Retries are deterministic.** Pay, then retry the *same* request.
- **Sessions are continuity keys.** Preserve `session_id` exactly as returned.

## Entry points

- [402 Payment Required (h402 challenge)](./402-payment-required.md)
- [401 Unauthorized vs 402 Payment Required](./401-unauthorized-vs-402.md)
- [Retry and Idempotency](./retry-and-idempotency.md)
- [Agent Flow Examples](./agent-flow-examples.md)