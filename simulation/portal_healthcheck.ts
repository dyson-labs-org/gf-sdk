import "dotenv/config";
import { PortalClient } from "../src/index.js";

async function main() {
  const client = new PortalClient();
  const health = await client.getHealth();
  console.log(JSON.stringify(health, null, 2));
}

main().catch((error) => {
  console.error("Portal healthcheck failed:", error?.message ?? error);
  process.exit(1);
});
