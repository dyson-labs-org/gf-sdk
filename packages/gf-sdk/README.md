# gf-sdk

Public SDK for the SCRAP Portal. It lets you create sessions (invoices or invoice-like requests), wait for settlement, and invoke capabilities.

This SDK is for integrators who need to call capabilities through the portal and providers who want to expose their own capabilities through an executor.

## Scope

This package speaks to the SCRAP Portal only. BTCPay-direct helpers live in `packages/gf-tools` and are internal-only.

## Create an invoice (no admin token required)

See `../../examples/create-invoice/` for a runnable invoice-creation example.

```ts
import { PortalClient } from "gf-sdk";

const DEFAULT_BASE_URL = "https://btcpay.dyson-labs.com"; // PRODUCTION (default)
// const DEFAULT_BASE_URL = "<staging base URL>"; // STAGING (TBD)
const DEFAULT_API_PREFIX = "/portal";

const baseUrl = process.env.GF_PORTAL_BASE_URL ?? DEFAULT_BASE_URL;
const apiPrefix = process.env.GF_PORTAL_API_PREFIX ?? DEFAULT_API_PREFIX;

const client = new PortalClient({ baseUrl, apiPrefix });

const session = await client.startSession({
  amount: "0.00001",
  currency: "BTC",
  memo: "gf-sdk invoice example"
});

console.log("session_id:", session.session_id);
console.log("checkout_url:", session.checkout_url ?? "");
```

`baseUrl` is the portal origin (customer-facing), for example `https://btcpay.dyson-labs.com`.
`apiPrefix` is the portal API prefix; production uses `/portal`.
The SDK always talks to the portal API root, never `/webhook`.
The portal runs on a remote VPS only (170.75.173.239). Local portal execution is not supported.
It is not a BTCPay webhook URL.
BTCPay webhooks and Greenfield APIs are internal-only.

No admin token is required for invoice creation. No BTCPay credentials are required.
`/portal-staging` is not currently exposed; staging is TBD unless explicitly provided.

Known-good env (production):

```bash
export GF_PORTAL_BASE_URL="https://btcpay.dyson-labs.com"
export GF_PORTAL_API_PREFIX="/portal"
export GF_PORTAL_V1_PREFIX="/v1"
```

```powershell
$env:GF_PORTAL_BASE_URL="https://btcpay.dyson-labs.com"
$env:GF_PORTAL_API_PREFIX="/portal"
$env:GF_PORTAL_V1_PREFIX="/v1"
```

`GF_PORTAL_API_PREFIX` should be `/portal`.
`GF_PORTAL_V1_PREFIX` should be `/v1` (NOT `/portal/v1`).
`PORTAL_ADMIN_TOKEN` is only required for admin-only endpoints (`actionRun`, legacy `executeAction`).

## 10-minute no-terminal quickstart

1. Create a new Node.js project in CodeSandbox, StackBlitz, or Replit.
2. Add the dependency `gf-sdk`.
3. Replace `index.js` with the file below.
4. Run.
5. You should see the exact output shown after the snippet.

```js
(async () => {
  const { executionHandle, scrapPortalClient } = await import("gf-sdk");

  const state = {
    sessionId: "sess_demo_001",
    executionId: "exec_demo_001",
    executorId: "EXECUTOR_DEMO",
    action: "demo:hello"
  };

  const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    });

  const parseBody = (init) => {
    if (!init || !init.body) return {};
    try {
      return JSON.parse(String(init.body));
    } catch {
      return {};
    }
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const path = url.pathname;

    if (path === "/portal/session/start") {
      return jsonResponse({ session_id: state.sessionId });
    }

    if (path === `/portal/session/${state.sessionId}/ready`) {
      return jsonResponse({
        session_id: state.sessionId,
        ready: true,
        settlement_ok: true,
        settlement_state: "settled"
      });
    }

    if (path === `/portal/v1/session/${state.sessionId}/actions/request`) {
      const body = parseBody(init);
      state.executorId = body.executor_id ?? state.executorId;
      state.action = body.action ?? state.action;
      return jsonResponse({ execution_id: state.executionId, status: "QUEUED" });
    }

    if (path === `/portal/v1/session/${state.sessionId}/actions/${state.executionId}/run`) {
      return jsonResponse({
        execution_id: state.executionId,
        status: "DELIVERED_TO_EXECUTOR",
        delivered: true
      });
    }

    if (path === `/portal/v1/session/${state.sessionId}/actions/${state.executionId}`) {
      return jsonResponse({
        session_id: state.sessionId,
        execution_id: state.executionId,
        executor_id: state.executorId,
        action: state.action,
        status: "DELIVERED_TO_EXECUTOR",
        token: { kind: "demo", value: "tok_demo_001" },
        executor_result: { reply: { reply: { ok: true } } }
      });
    }

    return new Response("Not found", { status: 404 });
  };

  const client = scrapPortalClient({
    baseUrl: "https://mock.portal"
  });

  const session = await client.sessionStart({ session_kind: "scrap_native", units: 1 });
  console.log("session_id:", session.session_id);

  const ready = await client.sessionReady(session.session_id);
  console.log("ready:", ready.ready, "settlement_ok:", ready.settlement_ok);

  const request = await client.actionRequest(session.session_id, {
    action: "demo:hello",
    executor_id: "EXECUTOR_DEMO",
    params: { name: "world" }
  });
  console.log("execution_id:", request.execution_id);

  const receipt = await executionHandle(client, session.session_id, request.execution_id).waitFor({
    until: "DELIVERED"
  });

  console.log("delivery_status:", receipt.status);
  console.log("token_kind:", receipt.token?.kind ?? "none");
  console.log("executor_ok:", receipt.executor_result?.reply?.reply?.ok ?? "unknown");
})();
```

Expected output:

```text
session_id: sess_demo_001
ready: true settlement_ok: true
execution_id: exec_demo_001
delivery_status: DELIVERED_TO_EXECUTOR
token_kind: demo
executor_ok: true
```

This quickstart uses a mock portal to simulate payment and delivery. When you have a real portal, remove the mock `fetch` block and set `baseUrl` to your portal URL.

## Admin-only: demo dispatch and legacy endpoints

Admin tokens are operator secrets. They must never be embedded in client-side apps.
Admin tokens are NOT required for invoice creation.

Use admin tokens only for operator-only demo dispatch or legacy endpoints.

Demo dispatch (SCRAP v1):

```ts
import { scrapPortalClient } from "gf-sdk";

const client = scrapPortalClient({
  baseUrl: "https://your-portal.example",
  adminToken: "<ADMIN_TOKEN>"
});

await client.actionRun("<SESSION_ID>", "<EXECUTION_ID>");
```

Legacy executeAction:

```ts
import { PortalClient } from "gf-sdk";

const client = new PortalClient({ baseUrl: "https://your-portal.example" });

const session = await client.startSession({
  amount: "0.00001",
  currency: "BTC",
  memo: "demo invoice"
});

const ready = await client.getSessionReady(session.session_id);
if (ready.ready) {
  const result = await client.executeAction(session.session_id, "sys:whoami", "<ADMIN_TOKEN>");
  console.log(result);
}
```

## Where to go next

Read the full docs index at `docs/README.md`.

Learn how routing works at `docs/source-routing/README.md`.

Expose your own capability in `docs/provider-guide/README.md`.

Validate your integration in `docs/testing/README.md`.

Need help? Open an issue in this repo with your portal base URL, session id, and the exact error message.

## CHANGELOG

- Removed deprecated `create-invoice` and `gf` modules from the public SDK surface.
- Made environment variable access safe in browser IDEs.
- Removed noisy debug logging from SCRAP v1 client requests.
