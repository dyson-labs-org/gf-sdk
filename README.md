# gf-sdk

Utilities for working with the Dyson Labs BTCPay servers.

## Environment setup

Run the interactive setup to create network-specific environment files:

```bash
npm install
npm run configure-env
```

The script prompts for your store details on both networks and writes:

- `.env.testnet`
- `.env.mainnet`
- `.env` (optional, if you choose an active network)

All files are compatible with `dotenv` and can be checked locally without committing secrets.

To switch networks later, re-run `npm run configure-env` or copy the desired file:

```bash
cp .env.testnet .env
# or
cp .env.mainnet .env
```

## Creating invoices

Load the environment you want to target and run the invoice script:

```bash
# Testnet
npm run dev -- --network=testnet

# Mainnet
npm run dev -- --network=mainnet
```

If you omit `--network`, the SDK will use the `NETWORK` value from your active environment file.

Build the TypeScript output with:

```bash
npm run build
```
