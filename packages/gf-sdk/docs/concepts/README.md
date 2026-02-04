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

`PortalClient` defaults to `http://127.0.0.1:18083` or `GF_PORTAL_BASE_URL`.

`scrapPortalClient` defaults to `http://127.0.0.1:18084` or `PORTAL_BASE_URL`.

Admin tokens can be provided directly or via `PORTAL_ADMIN_TOKEN` or `GF_PORTAL_ADMIN_TOKEN`.

## Next steps

- Run the no-terminal quickstart at `../quickstart-no-terminal/README.md`.
- Read routing basics at `../source-routing/README.md`.

## Back to Start Here

[Start Here](../../README.md)
