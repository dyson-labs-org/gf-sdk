# Security

## What you will accomplish

- Know which secrets the SDK uses and where they are sent.
- Avoid common mistakes that leak tokens.
- Understand the minimum safe deployment posture.

## Prerequisites

- None.

## Secrets and headers

- Admin tokens are sent as `X-Admin-Token` and `X-Portal-Admin-Token`.
- Admin tokens should never be embedded in client-side apps.
- Use admin tokens only in trusted environments.

## Recommended practices

- Keep `adminToken` on the server side only.
- Prefer short-lived tokens where possible.
- Use HTTPS for all portal traffic.
- Avoid logging full request bodies that might contain secrets.

## What the SDK does not do

- The SDK does not mint capability tokens.
- The SDK does not manage key storage.
- The SDK does not implement authentication beyond header placement.

## Next steps

- Review troubleshooting at `../troubleshooting/README.md`.
- Validate your integration using `../testing/README.md`.

## Back to Start Here

[Start Here](../../README.md)
