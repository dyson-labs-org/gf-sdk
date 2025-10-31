import "dotenv/config";
import { gfClient } from "./gf.js";

const { BTCPAY_URL, BTCPAY_API_KEY, STORE_ID } = process.env!;
if (!BTCPAY_URL || !BTCPAY_API_KEY || !STORE_ID) {
  throw new Error("Set BTCPAY_URL, BTCPAY_API_KEY, STORE_ID in .env");
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
