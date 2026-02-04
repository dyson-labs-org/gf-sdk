# Provider guide

## What you will accomplish

- Learn how to expose a routable capability through an executor id.
- Understand the minimum information a portal needs to route to you.
- See how to validate that routing works end-to-end.

## Prerequisites

- Access to the portal operator or your own portal deployment.
- An executor transport or bridge that can receive executions.

## Minimal provider checklist

1. Choose a stable `executor_id`.
2. Define the action strings you will accept, such as `demo:authorized` or `cmd:imaging:msi`.
3. Register the executor id with the portal operator so it can be routed.
4. Implement an executor that can receive executions and return a result.
5. Test routing with a real action request.

## What registration means today

Routing is static in the current SDK. The portal operator maps `executor_id` to your executor endpoint or bridge. The SDK simply includes `executor_id` in the action request.

## How to validate routing

- Use `scrapPortalClient.actionRequest` with your `executor_id`.
- Dispatch with `actionRun` if your portal requires admin dispatch.
- Read the receipt with `executionGet` and confirm `executor_id` and `status`.

## Next steps

- Learn routing details at `../source-routing/README.md`.
- Run the validation checklist at `../testing/README.md`.

## Back to Start Here

[Start Here](../../README.md)
