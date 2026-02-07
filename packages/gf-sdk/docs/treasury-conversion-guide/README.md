# Treasury & Conversion Guide

This document explains how institutions typically convert SCRAP settlement receipts into their preferred accounting currency (e.g. USD).

> **Scope & stance**
>
> SCRAP verifies **settlement and execution**. Dyson Labs does **not** custody funds, perform FX conversion, or provide treasury services. Currency conversion is handled by the customer’s existing treasury stack.

---

## Mental model

1. SCRAP settles in a **digital asset**
2. Execution occurs after cryptographic settlement finality
3. The customer converts or holds proceeds according to their internal treasury policy

This separation keeps SCRAP auditable, composable, and regulatorily simple.

---

## Common conversion patterns

### 1. Institutional exchanges (default recommendation)

Most organizations already use a regulated exchange for custody, trading, and reporting.

Typical flow:
- Receive settlement from SCRAP
- Deposit to institutional exchange account
- Convert via spot, advanced trade, or OTC desk
- Withdraw USD to bank account

Commonly used providers:
- Coinbase Prime
- Kraken
- Gemini
- Bitstamp
- Fidelity Crypto
- River

Why teams choose this:
- Familiar compliance posture (SOC2, audits, statements)
- Deep liquidity
- Clean accounting and reporting

Tradeoffs:
- Custodial
- Slower withdrawals compared to payment rails

---

### 2. BTC → USD payment rails

Some providers prefer immediate USD settlement without operating a trading desk.

Typical flow:
- Receive BTC settlement
- Auto-convert to USD
- Payout to bank account

Commonly used providers:
- Strike

Why teams choose this:
- Minimal crypto exposure
- Simple operational model
- Fast settlement

Tradeoffs:
- Primarily BTC-focused
- Less flexible for large or complex treasury operations

---

### 3. Custody + trading infrastructure (enterprise-grade)

Larger organizations may separate custody, execution, and trading permissions.

Typical flow:
- Receive settlement into a custody wallet
- Execute trades via exchange or OTC desk
- Withdraw fiat per treasury policy

Commonly used providers:
- Fireblocks
- Anchorage Digital
- Copper

Why teams choose this:
- Segregation of duties
- Policy-based approvals
- Large balance management

Tradeoffs:
- Heavier onboarding
- Higher cost
- Slower to deploy

---

### 4. Stablecoin-based treasury

Some organizations prefer to hold USD-denominated digital assets rather than bank USD.

Typical flow:
- Receive settlement
- Convert to USD-denominated stablecoin
- Hold, deploy, or off-ramp later

Why teams choose this:
- USD semantics without immediate bank interaction
- Fast, global settlement

Tradeoffs:
- Regulatory and counterparty considerations
- Not equivalent to cash-on-hand in all jurisdictions

---

## What SCRAP does not do

To avoid ambiguity:
- SCRAP does not provide wallets for customers
- SCRAP does not perform currency conversion
- SCRAP does not guarantee fiat value
- SCRAP does not hold customer balances

SCRAP’s responsibility ends at **provable settlement and execution**.

---

## Recommended internal policy language (example)

> "Settlement receipts from SCRAP are received in digital assets and converted to USD using the organization’s approved exchange or treasury provider. Dyson Labs does not custody or convert funds on our behalf."

---

## Questions

If your organization has specific compliance, accounting, or treasury constraints, contact Dyson Labs to discuss supported settlement units and integration patterns. Dyson Labs can provide settlement proofs and receipts suitable for audit and reconciliation workflows.

