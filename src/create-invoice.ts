#!/usr/bin/env node
import { fromEnv } from "./client.js";

export type InvoiceCliArgs = {
  amount: number;
  currency: string;
  megabytesTransferred: number;
  durationSeconds: number;
  sessionId: string;
  customerId?: string;
  missionId?: string;
};

export function parseArgs(argv: string[]): InvoiceCliArgs {
  const cliArgs = new Map<string, string>();

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [flag, value] = arg.slice(2).split("=", 2);
    if (!flag) continue;
    cliArgs.set(flag, value ?? "");
  }

  const amount = Number(cliArgs.get("amount"));
  const megabytes = Number(cliArgs.get("megabytes"));
  const seconds = Number(cliArgs.get("seconds"));
  const currency = cliArgs.get("currency") ?? "USD";
  const sessionId = cliArgs.get("session") || `sat-sim-${Date.now()}`;
  const customerId = cliArgs.get("customerId");
  const missionId = cliArgs.get("missionId");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid --amount: ${cliArgs.get("amount")}`);
  }
  if (!Number.isFinite(megabytes) || megabytes < 0) {
    throw new Error(`Invalid --megabytes: ${cliArgs.get("megabytes")}`);
  }
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Invalid --seconds: ${cliArgs.get("seconds")}`);
  }

  return {
    amount,
    currency,
    megabytesTransferred: megabytes,
    durationSeconds: seconds,
    sessionId,
    customerId,
    missionId,
  };
}

export async function createInvoiceFromCli(args: InvoiceCliArgs) {
  const sdk = fromEnv();

  const note = `Satellite sim transfer of ${args.megabytesTransferred.toFixed(
    2,
  )} MB over ${args.durationSeconds.toFixed(1)} seconds`;

  const invoice = await sdk.createInvoice({
    amount: args.amount,
    currency: args.currency,
    customerId: args.customerId,
    missionId: args.missionId,
    note,
    usage: {
      megabytes: args.megabytesTransferred,
      seconds: args.durationSeconds,
    },
    metadata: {
      sessionId: args.sessionId,
      workload: "satellite-sim",
    },
  });

  console.log("Invoice created for simulation:");
  console.log(`  Session: ${args.sessionId}`);
  console.log(`  Amount Due: ${args.amount.toFixed(2)} ${args.currency}`);
  console.log(`  Data Transferred: ${args.megabytesTransferred.toFixed(2)} MB`);
  console.log("Invoice ID:", invoice.id);
  console.log("Checkout URL:", invoice.checkoutLink);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await createInvoiceFromCli(args);
}

main().catch((e) => {
  console.error("Error:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});

