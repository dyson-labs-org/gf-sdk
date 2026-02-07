# Concepts and glossary

## What you will accomplish

- Understand the core objects: sessions, executions, executors, and capabilities.
- Know which client to use for each portal endpoint family.
- Learn the minimal vocabulary used throughout the docs.

## Prerequisites

- None.

## Mental model

A client creates a session. Settlement makes the session ready. Ready sessions can request an action. The portal routes the action to an executor. Executions are tracked by `execution_id`.

Two client entry points exist in this SDK:

- `PortalClient` for legacy portal endpoints such as `/portal/session/start` and `/portal/session/{id}/ready`.
- `scrapPortalClient` for the SCRAP v1 endpoints such as `/portal/v1/session/{id}/actions/request`.

## Glossary

- Portal: The HTTP service that creates sessions and routes actions.
- Session: A payment-backed or invoice-like request. Identified by `session_id`.
- Settlement: The payment state associated with a session. Reported by `settlement_state` and `ready`.
- Action: A capability invocation string, such as `demo:authorized`.
- Executor: The provider or bridge that receives routed actions. Identified by `executor_id`.
- Execution: A specific action request. Identified by `execution_id` and tracked via receipts.
- Receipt: The execution status record returned by `executionGet`.
- Admin token: A privileged token for demo or operator actions. Sent as `X-Admin-Token`.
- Capability token: A signed authorization token. Not created by this SDK, but may appear in receipts.

## Defaults

`PortalClient` defaults to `https://btcpay.dyson-labs.com` or `GF_PORTAL_BASE_URL`, with `GF_PORTAL_API_PREFIX` defaulting to `/portal`.

`scrapPortalClient` defaults to `https://btcpay.dyson-labs.com` or `GF_PORTAL_BASE_URL`/`PORTAL_BASE_URL`, with `GF_PORTAL_API_PREFIX` defaulting to `/portal`.
V1 endpoints are deployment-specific; set `GF_PORTAL_V1_PREFIX` if your portal exposes them.
`GF_PORTAL_V1_PREFIX` is appended to `GF_PORTAL_API_PREFIX` and must be relative (do not include `/portal`).

The SCRAP Portal runs on a remote VPS only (170.75.173.239). Local portal execution is not supported.
`/portal-staging` is not currently exposed; staging is TBD unless explicitly provided.

Admin tokens can be provided directly or via `PORTAL_ADMIN_TOKEN` or `GF_PORTAL_ADMIN_TOKEN`.

## Next steps

- Run the no-terminal quickstart at `../quickstart-no-terminal/README.md`.
- Read routing basics at `../source-routing/README.md`.

## Back to Start Here

[Start Here](../../README.md)
