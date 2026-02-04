# Troubleshooting

## What you will accomplish

- Diagnose common integration errors quickly.
- Map errors to the exact fix.

## Prerequisites

- The full error message and the request you were trying to make.

## Fast fixes

Error: `Portal session start requires an amount.`
Fix: Provide `amount` when calling `PortalClient.startSession`.

Error: `Portal request failed: 401 Unauthorized`.
Fix: Use a valid admin token only for admin endpoints.

Error: `Portal request failed: 404 Not Found`.
Fix: Verify the base URL and the `/portal` or `/portal/v1` path.

Error: `Timed out waiting for execution`.
Fix: Confirm your executor is reachable and that you dispatched with `actionRun` if required.

Error: `executor_id is required.`
Fix: Include `executor_id` in `actionRequest`.

Error: Browser CORS blocked.
Fix: Run from a server-side environment or enable CORS on the portal.

## Next steps

- Re-run the smoke test in `../testing/README.md`.
- Check routing details in `../source-routing/README.md`.

## Back to Start Here

[Start Here](../../README.md)
