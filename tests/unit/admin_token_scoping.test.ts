import assert from "node:assert/strict";
import test from "node:test";

import { PortalClient, scrapPortalClient } from "../../packages/gf-sdk/src/index.js";

const adminTokenError = (methodName: string) =>
  `Admin token is required for ${methodName}. This method is admin-only. Invoice creation does not require an admin token.`;

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

test("sessionStart works without admin token", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders: Headers | undefined;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (_input, init = {}) => {
    capturedHeaders = new Headers(init?.headers);
    return jsonResponse({ session_id: "sess_123" });
  };

  const client = scrapPortalClient({ baseUrl: "https://example.test", adminToken: "" });
  const session = await client.sessionStart({ session_kind: "scrap_native", units: 1 });

  assert.equal(session.session_id, "sess_123");
  assert.equal(capturedHeaders?.has("X-Admin-Token"), false);
  assert.equal(capturedHeaders?.has("X-Portal-Admin-Token"), false);
});

test("sessionStart does not send admin headers when adminToken is set", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders: Headers | undefined;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (_input, init = {}) => {
    capturedHeaders = new Headers(init?.headers);
    return jsonResponse({ session_id: "sess_456" });
  };

  const client = scrapPortalClient({ baseUrl: "https://example.test", adminToken: "secret" });
  const session = await client.sessionStart({ session_kind: "scrap_native", units: 1 });

  assert.equal(session.session_id, "sess_456");
  assert.equal(capturedHeaders?.has("X-Admin-Token"), false);
  assert.equal(capturedHeaders?.has("X-Portal-Admin-Token"), false);
});

test("actionRun sends admin headers when adminToken is set", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders: Headers | undefined;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (_input, init = {}) => {
    capturedHeaders = new Headers(init?.headers);
    return jsonResponse({ execution_id: "exec_123", status: "DELIVERED_TO_EXECUTOR" });
  };

  const client = scrapPortalClient({ baseUrl: "https://example.test", adminToken: "secret" });
  await client.actionRun("sess_123", "exec_123");

  assert.equal(capturedHeaders?.get("X-Admin-Token"), "secret");
  assert.equal(capturedHeaders?.get("X-Portal-Admin-Token"), "secret");
});

test("actionRun throws a clear error when adminToken is missing", async () => {
  const client = scrapPortalClient({ baseUrl: "https://example.test", adminToken: "" });

  await assert.rejects(
    () => client.actionRun("sess_123", "exec_123"),
    (error) => {
      assert.equal((error as Error).message, adminTokenError("actionRun"));
      return true;
    }
  );
});

test("PortalClient.executeAction throws a clear error when adminToken is missing", async () => {
  const client = new PortalClient({ baseUrl: "https://example.test" });

  await assert.rejects(
    () => client.executeAction("sess_123", "sys:whoami", ""),
    (error) => {
      assert.equal((error as Error).message, adminTokenError("executeAction"));
      return true;
    }
  );
});
