import { btcpayClient } from "./btcpayClient.js";

export type SimulationInvoiceArgs = {
  amount: number;
  currency: string;
  megabytesTransferred: number;
  durationSeconds: number;
  sessionId: string;
};

function buildMetadata(args: SimulationInvoiceArgs) {
  return {
    orderId: args.sessionId.toUpperCase(),
    note: `Satellite sim transfer of ${args.megabytesTransferred.toFixed(2)} MB over ${args.durationSeconds.toFixed(0)} seconds`,
    simulation: {
      sessionId: args.sessionId,
      megabytesTransferred: args.megabytesTransferred,
      durationSeconds: args.durationSeconds
    }
  };
}

export async function createSimulationInvoice(args: SimulationInvoiceArgs) {
  const { BTCPAY_URL, BTCPAY_API_KEY, STORE_ID } = process.env;
  if (!BTCPAY_URL || !BTCPAY_API_KEY || !STORE_ID) {
    throw new Error("Set BTCPAY_URL, BTCPAY_API_KEY, STORE_ID in the environment.");
  }

  const client = btcpayClient(BTCPAY_URL, BTCPAY_API_KEY);
  const idempotencyKey = `${args.sessionId}-${Date.now()}`;
  const { data } = await client.post(
    `/stores/${STORE_ID}/invoices`,
    {
      amount: args.amount.toFixed(2),
      currency: args.currency,
      metadata: buildMetadata(args)
    },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );

  return {
    sessionId: args.sessionId,
    amount: args.amount,
    currency: args.currency,
    megabytesTransferred: args.megabytesTransferred,
    durationSeconds: args.durationSeconds,
    invoiceId: data.id,
    checkoutUrl: data.checkoutLink
  };
}
