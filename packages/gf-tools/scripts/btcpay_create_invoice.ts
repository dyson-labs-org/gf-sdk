import "dotenv/config";
import { createSimulationInvoice } from "../src/createSimulationInvoice.js";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await createSimulationInvoice(args);

  console.log("Invoice created for simulation:");
  console.log(`  Session ID: ${result.sessionId}`);
  console.log(`  Amount Due: ${result.amount.toFixed(2)} ${result.currency}`);
  console.log(`  Data Transferred: ${result.megabytesTransferred.toFixed(2)} MB`);
  console.log("Invoice ID:", result.invoiceId);
  console.log("Checkout URL:", result.checkoutUrl);
}

main().catch((e) => {
  console.error("Error:", e?.response?.data ?? e.message);
  process.exit(1);
});
