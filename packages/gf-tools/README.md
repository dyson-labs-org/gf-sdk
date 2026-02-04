# gf-tools (internal)

Internal tooling and simulation helpers for Dyson Labs. Not for external integrators.

## BTCPay simulation invoice

Required env vars:
- `BTCPAY_URL`
- `BTCPAY_API_KEY`
- `STORE_ID`

Run:

```
pnpm -C packages/gf-tools btcpay:create-invoice -- --amount=12.50 --megabytes=625 --seconds=180 --session=sat-sim-demo
```

## Satellite simulation

```
python simulation/satellite_simulation.py
```

The simulation forwards usage to the BTCPay invoice script.
