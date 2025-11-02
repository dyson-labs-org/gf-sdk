import { loadNetworkEnv } from "./env.js";
import { gfClient } from "./gf.js";

const networkArg = process.argv
  .slice(2)
  .find((arg: string) => arg.startsWith("--network="))
  ?.split("=")[1];

const activeNetwork = loadNetworkEnv(networkArg);

if (networkArg && !activeNetwork) {
  throw new Error(
    `Unknown network "${networkArg}". Expected one of: testnet, mainnet.`
  );
}

const { BTCPAY_URL, BTCPAY_API_KEY, STORE_ID } = process.env!;
if (!BTCPAY_URL || !BTCPAY_API_KEY || !STORE_ID) {
  const suffix = activeNetwork ? ` for ${activeNetwork}` : "";
  throw new Error(`Set BTCPAY_URL, BTCPAY_API_KEY, STORE_ID${suffix} in your env file.`);
}

const gf = gfClient(BTCPAY_URL, BTCPAY_API_KEY);

async function main() {
  const idempotencyKey = `sat-demo-${Date.now()}`;
  const { data } = await gf.post(
    `/stores/${STORE_ID}/invoices`,
    {
      amount: "25.00",
      currency: "USD",
      metadata: { orderId: "SAT-OTV-000123", note: "Delta-v maneuver slot" },
      checkout: { redirectURL: "https://example.com/thanks" }
    },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );

  console.log("Invoice ID:", data.id);
  console.log("Checkout URL:", data.checkoutLink);
}

main().catch((e) => {
  console.error("Error:", e.response?.data ?? e.message);
  process.exit(1);
});
