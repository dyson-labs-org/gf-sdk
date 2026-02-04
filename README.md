# gf-sdk Monorepo

This repo is split into two packages:

- `packages/gf-sdk` — public SCRAP Portal SDK for integrators (PortalClient only)
- `packages/gf-tools` — internal tooling and simulation helpers (BTCPay-direct, dev scripts)

## Workspace commands

```
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Package commands

```
pnpm -C packages/gf-sdk build
pnpm -C packages/gf-sdk portal:health
pnpm -C packages/gf-sdk smoke

pnpm -C packages/gf-tools btcpay:create-invoice
```

## Migration note

If you previously used BTCPay-direct helpers from `gf-sdk`, they have moved to `packages/gf-tools`.
The public SDK now targets the SCRAP Portal only.
