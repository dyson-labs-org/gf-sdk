# Source routing

## What you will accomplish

- Understand how routing works in the portal today.
- Learn which fields express routing decisions.
- See a concrete end-to-end routing example.

## Prerequisites

- A SCRAP Portal base URL.
- An executor id you are allowed to target.

Note: SCRAP v1 endpoints are deployment-specific and may not be exposed on production. Do not assume `/portal/v1`.
Set `GF_PORTAL_API_PREFIX` (usually `/portal`) and `GF_PORTAL_V1_PREFIX` (usually `/v1`) to match your portal deployment.
`GF_PORTAL_V1_PREFIX` is appended to `GF_PORTAL_API_PREFIX` and must be relative (do not include `/portal`).

## What is routed

The portal routes capability invocations and their executions. Sessions are the payment or request container that enables those executions.

## Who selects the route

The client selects the route by choosing `executor_id` and `action` in the action request. The portal enforces access and forwards the execution to the selected executor.

## Identifiers that participate

- `session_id` ties everything to a payment or request.
- `execution_id` identifies the execution after you request it.
- `executor_id` selects the executor that should receive the action.
- `action` is the capability identifier string, sometimes called a capability id.
- Route hints are not modeled in the SDK yet. Treat them as a future extension.

## How routing is expressed

Routing data is expressed in the action request body and the session id in the URL.

- `POST /portal/v1/session/{session_id}/actions/request` with `{ action, executor_id, params }`.
- `X-Admin-Token` header is required for demo dispatch via `actionRun`.

## ASCII diagram

```text
Client
  | action + executor_id
  v
Portal
  | routed execution
  v
Executor (provider)
```

## End-to-end routing example

```ts
import { scrapPortalClient } from "gf-sdk";

const client = scrapPortalClient({
  baseUrl: "https://your-portal.example",
  adminToken: "<ADMIN_TOKEN>"
});

const session = await client.sessionStart({ session_kind: "scrap_native", units: 1 });
await client.sessionReady(session.session_id);

const request = await client.actionRequest(session.session_id, {
  action: "demo:authorized",
  executor_id: "JETSON-A",
  params: { target: "site-001" }
});

await client.actionRun(session.session_id, request.execution_id);
const receipt = await client.executionGet(session.session_id, request.execution_id);
console.log(receipt.executor_id, receipt.status);
```

## Routing models

Static routing table (today): The portal operator maintains a map of `executor_id` to executor endpoint or bridge. Clients choose the `executor_id` directly.

Dynamic discovery (future): Executors register capabilities and the portal selects a route automatically. This is not implemented in the SDK yet and should be treated as a roadmap concept.

## Next steps

- Learn how to expose your own executor in `../provider-guide/README.md`.
- Validate routing in `../testing/README.md`.

## Back to Start Here

[Start Here](../../README.md)
