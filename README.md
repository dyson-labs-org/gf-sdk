# gf-sdk

External SDK for interacting with the SCRAP Portal. BTCPay-direct tooling is internal-only.

## External: PortalClient

Use `PortalClient` to query portal health:

```ts
import { PortalClient } from "gf-sdk";

const client = new PortalClient({
  baseUrl: "http://127.0.0.1:18083"
});

const health = await client.getHealth();
```

Defaults:
- `baseUrl`: `process.env.GF_PORTAL_BASE_URL` or `http://127.0.0.1:18083`
- `timeoutMs`: 15000

Run the local healthcheck:

```
npm run portal:health
```

## Internal: BTCPay simulation scripts only

These scripts are for internal tooling and must not be used by external integrators.

Create a simulation invoice:

```
npm run btcpay:create-invoice -- --amount=12.50 --megabytes=625 --seconds=180 --session=sat-sim-demo
```

Environment variables required:
- `BTCPAY_URL`
- `BTCPAY_API_KEY`
- `STORE_ID`

## Satellite simulation

Run the interactive simulation to model the datalink between two satellites and
automatically create an invoice when you stop the session:

```
python simulation/satellite_simulation.py
```

The visualiser uses Matplotlib. Install it (and any other required
dependencies) in your Python environment if necessary:

```
pip install matplotlib
```
