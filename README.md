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

## Configuration

`gf-sdk` is designed to talk to Dyson-operated BTCPayServer instances.

Set these environment variables (e.g. in a `.env` file):

```env
GF_ENV=testnet                # or mainnet-staging, mainnet
BTCPAY_URL=https://testnet-btcpay.dyson-labs.com
BTCPAY_API_KEY=your-greenfield-api-key
STORE_ID=your-store-id

