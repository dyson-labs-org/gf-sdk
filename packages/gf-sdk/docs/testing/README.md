# Testing and validation

## What you will accomplish

- Validate that the SDK loads in a browser IDE.
- Confirm session creation, settlement, and action invocation.
- Verify routing to the expected executor.

## Prerequisites

- A SCRAP Portal base URL for real tests.
- An admin token if you plan to call `actionRun` or legacy `executeAction`.

## Known-good example outputs

Portal health:

```json
{
  "status": "ok",
  "service": "portal",
  "time": "2026-02-04T12:00:00Z",
  "env": "staging"
}
```

Session start (SCRAP v1):

```json
{
  "session_id": "sess_demo_001"
}
```

Session ready:

```json
{
  "session_id": "sess_demo_001",
  "ready": true,
  "settlement_ok": true,
  "settlement_state": "settled"
}
```

Action request:

```json
{
  "execution_id": "exec_demo_001",
  "status": "QUEUED"
}
```

Execution receipt:

```json
{
  "session_id": "sess_demo_001",
  "execution_id": "exec_demo_001",
  "executor_id": "JETSON-A",
  "action": "demo:authorized",
  "status": "DELIVERED_TO_EXECUTOR",
  "token": { "kind": "demo", "value": "tok_demo_001" },
  "executor_result": { "reply": { "reply": { "ok": true } } }
}
```

## Checklist: SDK load

- Import `scrapPortalClient` from `gf-sdk`.
- Create a client with `baseUrl` set.
- Confirm no runtime errors on import.

## Checklist: Invoice creation

- Use `PortalClient.startSession` with `amount` and `currency`.
- Capture `session_id`, `invoice_id`, and `checkout_url`.
- Store `session_id` for later readiness polling.

## Checklist: Payment or simulation

- Pay via `checkout_url` for real portals.
- For mock testing, return `{ ready: true, settlement_ok: true }`.
- Confirm `getSessionReady` returns `ready: true`.

## Checklist: Session or token issuance

- Confirm `session_id` is present after session start.
- If your portal provides capability tokens, verify `receipt.token` exists.
- If no token is present, validate that execution still completes.

## Checklist: Capability invocation

- Call `actionRequest` with `action`, `executor_id`, and `params`.
- Confirm `execution_id` is returned.
- If required, call `actionRun` with admin token.

## Checklist: Correct routing

- Read `executionGet` and confirm `executor_id` matches your target.
- Confirm status reaches `DELIVERED_TO_EXECUTOR` or `COMPLETED`.

## Browser IDE smoke test

- Run the no-terminal quickstart in `../quickstart-no-terminal/README.md`.
- Confirm the output matches exactly.

## Common mistakes and fast diagnosis

- Error: `Portal request failed: 401 Unauthorized`.
Fix: Confirm `adminToken` is set only for admin endpoints.

- Error: `Portal request failed: 404 Not Found` on action request.
Fix: Confirm you are using the `/portal/v1` endpoints and the correct base URL.

- Error: `Timed out waiting for execution`.
Fix: Confirm your executor is reachable and that you dispatched with `actionRun` if required.

- Error: `executor_id is required.`
Fix: Provide `executor_id` in `actionRequest`.

## Next steps

- Review routing concepts at `../source-routing/README.md`.
- Tighten security practices at `../security/README.md`.

## Back to Start Here

[Start Here](../../README.md)
