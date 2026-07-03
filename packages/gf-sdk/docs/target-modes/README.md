# Target Modes

## Purpose

`gf-sdk` currently supports the connected SCRAP Portal client path. Long term,
the SDK should support three target modes without breaking the current remote
Portal behavior.

## 1. Remote Portal Client

This is the current connected path. The SDK points at a SCRAP Portal HTTP
origin, creates sessions, checks settlement readiness, and requests actions
through Portal endpoints.

Current remote Portal behavior remains supported. The SDK does not require
BTCPay credentials for public invoice creation, and admin tokens remain
operator-only.

## 2. Local Or Enclave Portal Client

Target mode: the same client points at a local or customer-enclave Portal or a
local market control plane endpoint.

Acceptance criteria before this is claimed as implemented:

- local/enclave endpoint configuration is explicit;
- no mandatory Dyson SaaS dependency exists for local evaluation or local
  receipt verification;
- adapter calls remain explicit and disabled by default;
- no admin token, BTCPay secret, customer data, private endpoint, or runtime
  state is embedded in SDK examples.

## 3. Offline Bundle Generation And Verification

Target mode: the SDK can help generate or verify signed import/export bundles
for disconnected operation.

Future bundle workflows may include:

- signed import bundles for scenarios, models, provider packs, or evidence
  packs;
- local SCRAP receipt verification;
- signed export bundles for audit, true-up, federation, or support review;
- fee-bearing settlement records for recognized transactions.

Acceptance criteria before this is claimed as implemented:

- bundle signatures and hashes can be verified locally;
- records distinguish local evaluation, verification, evidence review, and
  later connected reconciliation;
- fee-bearing records use `fee_bps = 100` or `dyson_fee_bps = 100` only as a
  signed settlement term, not phone-home telemetry;
- docs state that private or stripped forks can remove fee logic and that
  Dyson recognition can require fee-bearing records for official participation.

## Non-Claims

This guide does not implement local Portal execution, offline bundle generation,
receipt verification, prepaid credits, federation, fee true-up, live payment,
split payout, provider execution, AWS calls, RF execution, or production
settlement.
