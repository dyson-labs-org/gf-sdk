import { PortalClient } from "gf-sdk";
import assert from "node:assert/strict";

const DEFAULT_BASE_URL = "https://btcpay.dyson-labs.com";
const DEFAULT_API_PREFIX = "/portal";

function readFlagValue(argv: string[], flag: string): string | undefined {
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  if (index >= 0 && argv[index + 1]) return argv[index + 1];
  return undefined;
}

const args = process.argv.slice(2);
const baseUrl = readFlagValue(args, "--baseUrl") ?? process.env.GF_PORTAL_BASE_URL ?? DEFAULT_BASE_URL;
const apiPrefix = readFlagValue(args, "--apiPrefix") ?? process.env.GF_PORTAL_API_PREFIX ?? DEFAULT_API_PREFIX;

const client = new PortalClient({ baseUrl, apiPrefix });

const session = await client.startSession({
  amount: "2.50",
  currency: "USD",
  memo: "gf-sdk invoice example"
});

console.log("session_id:", session.session_id);
console.log("invoice_id:", session.invoice_id);

const expected_total_sats =
  session.invoice?.expected_total_sats ??
  session.pricing?.total_sats ??
  session.expectedTotalSats ??
  null;

console.log("expected_total_sats:", expected_total_sats);
console.log("checkout_url:", session.checkout_url);

assert.ok(session.invoice_id, "missing invoice_id from portal response");
