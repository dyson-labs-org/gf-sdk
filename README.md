# gf-sdk

Utilities for working with the Dyson Labs BTCPay servers.

## Environment setup



## Creating invoices

The TypeScript invoice generator now expects usage details from the satellite
simulation (or any other client). Provide the billed amount, total data
transferred, and elapsed time via CLI flags:

```
npx tsx src/create-invoice.ts --amount=12.50 --megabytes=625 --seconds=180 --session=sat-sim-demo
```

Environment variables `BTCPAY_URL`, `BTCPAY_API_KEY`, and `STORE_ID` must be set
before running the script.

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
