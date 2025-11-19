import "dotenv/config";
import { randomUUID } from "node:crypto";
import { gfClient } from "./gf.js";

export type GfEnv = "testnet" | "mainnet-staging" | "mainnet";

export interface GfSdkConfig {
  /** Logical environment label (for your own tracking/logging). */
  env?: GfEnv;
  /** Base URL of the BTCPayServer instance, e.g. https://testnet-btcpay.dyson-labs.com */
  btcpayUrl: string;
  /** Greenfield API key for the Dyson-controlled store. */
  apiKey: string;
  /** Store ID on that BTCPay instance. */
  storeId: string;
}

export interface UsageMetadata {
  megabytes?: number;
  seconds?: number;
  [key: string]: number | undefined;
}

export interface CreateInvoiceParams {
  /** Fiat amount to bill (e.g. 12.50). */
  amount: number;
  /** Currency code, defaults to "USD". */
  currency?: string;
  /** Dyson customer identifier (e.g. "acme-space"). */
  customerId?: string;
  /** Mission / workload identifier (e.g. "narsil-1"). */
  missionId?: string;
  /** Optional human-readable note. */
  note?: string;
  /** Usage details (MB transferred, seconds of link, kWh, etc.). */
  usage?: UsageMetadata;
  /** Additional arbitrary metadata to store on the invoice. */
  metadata?: Record<string, unknown>;
  /** Optional idempotency key; if omitted, one is generated. */
  idempotencyKey?: string;
}

export interface CreatedInvoice {
  id: string;
  checkoutLink: string;
  raw: any;
}

export class GfSdk {
  private readonly cfg: GfSdkConfig;

  constructor(cfg: GfSdkConfig) {
    if (!cfg.btcpayUrl) throw new Error("GfSdkConfig.btcpayUrl is required");
    if (!cfg.apiKey) throw new Error("GfSdkConfig.apiKey is required");
    if (!cfg.storeId) throw new Error("GfSdkConfig.storeId is required");
    this.cfg = cfg;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<CreatedInvoice> {
    const {
      amount,
      currency = "USD",
      customerId,
      missionId,
      note,
      usage,
      metadata = {},
      idempotencyKey,
    } = params;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    const client = gfClient(this.cfg.btcpayUrl, this.cfg.apiKey);
    const key = idempotencyKey ?? randomUUID();

    const payload = {
      amount: amount.toFixed(2),
      currency,
      metadata: {
        ...metadata,
        env: this.cfg.env,
        customerId,
        missionId,
        usage,
      },
      additionalSearchTerms: [customerId, missionId].filter(Boolean),
      checkout: note ? { speedPolicy: "HighSpeed", defaultPaymentMethod: "BTC", expirationMinutes: 60 } : undefined,
    };

    const { data } = await client.post(
      `/stores/${this.cfg.storeId}/invoices`,
      payload,
      { headers: { "Idempotency-Key": key } },
    );

    return {
      id: data.id,
      checkoutLink: data.checkoutLink,
      raw: data,
    };
  }
}

/**
 * Convenience factory: build a GfSdk from environment variables.
 *
 * Required:
 *   BTCPAY_URL
 *   BTCPAY_API_KEY
 *   STORE_ID
 *
 * Optional:
 *   GF_ENV = "testnet" | "mainnet-staging" | "mainnet"
 */
export function fromEnv(): GfSdk {
  const { GF_ENV, BTCPAY_URL, BTCPAY_API_KEY, STORE_ID } = process.env;

  if (!BTCPAY_URL || !BTCPAY_API_KEY || !STORE_ID) {
    throw new Error(
      "BTCPAY_URL, BTCPAY_API_KEY, and STORE_ID must be set in the environment (.env) to use fromEnv().",
    );
  }

  const env = (GF_ENV as GfEnv | undefined);

  return new GfSdk({
    env,
    btcpayUrl: BTCPAY_URL,
    apiKey: BTCPAY_API_KEY,
    storeId: STORE_ID,
  });
}
