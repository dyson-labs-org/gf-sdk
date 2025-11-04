import "dotenv/config";
import { gfClient } from "./gf.js";

export type InvoiceCliArgs = {
  amount: number;
  currency: string;
  megabytesTransferred: number;
  durationSeconds: number;
  sessionId: string;
};

export function parseArgs(argv: string[]): InvoiceCliArgs {
  const cliArgs = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [flag, value] = arg.slice(2).split("=", 2);
    if (flag && value !== undefined) {
      cliArgs.set(flag, value);
    }
  }

  const amount = Number(cliArgs.get("amount"));
  const currency = cliArgs.get("currency") ?? "USD";
  const megabytesTransferred = Number(cliArgs.get("megabytes"));
  const durationSeconds = Number(cliArgs.get("seconds"));
  const sessionId = cliArgs.get("session") ?? `sat-sim-${Date.now()}`;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("--amount must be provided as a positive number (e.g. --amount=12.5)");
  }

  if (!Number.isFinite(megabytesTransferred) || megabytesTransferred < 0) {
    throw new Error("--megabytes must be provided as a non-negative number (e.g. --megabytes=450.25)");
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("--seconds must be provided as a positive number (e.g. --seconds=120)");
  }

  return { amount, currency, megabytesTransferred, durationSeconds, sessionId };
}

function buildMetadata(args: InvoiceCliArgs) {
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

export async function createInvoice(args: InvoiceCliArgs) {
  const { BTCPAY_URL, BTCPAY_API_KEY, STORE_ID } = process.env!;
  if (!BTCPAY_URL || !BTCPAY_API_KEY || !STORE_ID) {
    throw new Error("Set BTCPAY_URL, BTCPAY_API_KEY, STORE_ID in .env");
  }

  const gf = gfClient(BTCPAY_URL, BTCPAY_API_KEY);
  const idempotencyKey = `${args.sessionId}-${Date.now()}`;
  const { data } = await gf.post(
    `/stores/${STORE_ID}/invoices`,
    {
      amount: args.amount.toFixed(2),
      currency: args.currency,
      metadata: buildMetadata(args)
    },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );

  console.log("Invoice created for simulation:");
  console.log(`  Session ID: ${args.sessionId}`);
  console.log(`  Amount Due: ${args.amount.toFixed(2)} ${args.currency}`);
  console.log(`  Data Transferred: ${args.megabytesTransferred.toFixed(2)} MB`);
  console.log("Invoice ID:", data.id);
  console.log("Checkout URL:", data.checkoutLink);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await createInvoice(args);
}

main().catch((e) => {
  console.error("Error:", e.response?.data ?? e.message);
  process.exit(1);
});
