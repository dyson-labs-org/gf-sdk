# gf-sdk

Public SDK for the SCRAP Portal. It lets you create sessions (invoices or invoice-like requests), wait for settlement, and invoke capabilities.

This SDK is for integrators who need to call capabilities through the portal and providers who want to expose their own capabilities through an executor.

## Scope

This package speaks to the SCRAP Portal only. BTCPay-direct helpers live in `packages/gf-tools` and are internal-only.

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
    baseUrl: "https://mock.portal",
    adminToken: "demo_admin_token"
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

  await client.actionRun(session.session_id, request.execution_id);

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

## Minimal invoice -> capability call (real portal)

Use the legacy portal endpoints for a real invoice and a demo capability call. This requires an admin token.

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
