# gf-sdk

Public SCRAP Portal SDK for integrators. This package speaks to the SCRAP Portal only and does **not** expose any BTCPay-direct helpers.

## Integration model

Integrators should use the Portal API for session lifecycle:
- start session (invoice creation)
- poll session readiness
- optional action execution once settled

BTCPay-direct helpers are internal and live in `packages/gf-tools` only.

## Usage

```ts
import { PortalClient } from "gf-sdk";

const client = new PortalClient({
  baseUrl: "https://btcpay.dyson-labs.com"
});

const session = await client.startSession({
  amount: "0.00001",
  currency: "BTC",
  memo: "example"
});

const ready = await client.getSessionReady(session.session_id);
```

### Staging base URL (path prefix)

```ts
const client = new PortalClient({
  baseUrl: "https://btcpay.dyson-labs.com/portal-staging"
});
```

## CLI helpers

Portal healthcheck:

```
pnpm -C packages/gf-sdk portal:health
```

Portal smoke test:

```
GF_PORTAL_BASE_URL=https://btcpay.dyson-labs.com/portal-staging \
GF_AMOUNT=0.00001 \
GF_CURRENCY=BTC \
GF_MEMO="gf-sdk smoke test" \
GF_TIMEOUT_S=180 \
pnpm -C packages/gf-sdk smoke
```

Note: the session will not become ready until the invoice is paid via the `checkout_url`.
