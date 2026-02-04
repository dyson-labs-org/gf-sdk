# No-terminal quickstart

## What you will accomplish

- Create a session (invoice-like request).
- Simulate settlement.
- Request and dispatch a capability.
- Receive an execution receipt.

## Prerequisites

- A browser IDE with a Node.js template.
- Ability to add a dependency named `gf-sdk`.

## Steps

1. Create a new Node.js project in your browser IDE.
2. Add the dependency `gf-sdk`.
3. Replace `index.js` with the file below.
4. Run.
5. Confirm the exact output shown after the snippet.

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

## Swap in a real portal

1. Remove the `globalThis.fetch` mock block.
2. Set `baseUrl` to your SCRAP Portal URL.
3. If your portal requires admin dispatch, set `adminToken` to your portal admin token.
4. Keep the rest of the flow the same.

For Lightning invoices, use the `PortalClient` flow in `../../README.md`.

## Next steps

- Learn routing decisions at `../source-routing/README.md`.
- Expose your own capability in `../provider-guide/README.md`.

## Back to Start Here

[Start Here](../../README.md)
