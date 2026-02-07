import assert from "node:assert/strict";
import test from "node:test";

import { scrapPortalClient } from "../../packages/gf-sdk/src/index.js";

const guardrailMessage =
  "GF_PORTAL_V1_PREFIX must be relative (e.g. '/v1'), not '/portal/v1'. It is appended to GF_PORTAL_API_PREFIX.";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

test("scrapPortalClient throws when v1Prefix includes /portal", () => {
  assert.throws(
    () =>
      scrapPortalClient({
        baseUrl: "https://example.test",
        apiPrefix: "/portal",
        v1Prefix: "/portal/v1",
        adminToken: "x"
      }),
    (error) => {
      assert.equal((error as Error).message, guardrailMessage);
      return true;
    }
  );
});

test("v1Prefix /v1 composes /portal/v1 path", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | undefined;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init = {}) => {
    capturedUrl = typeof input === "string" ? input : input.url;
    return jsonResponse({ execution_id: "exec_123", status: "QUEUED" });
  };

  const client = scrapPortalClient({
    baseUrl: "https://example.test",
    apiPrefix: "/portal",
    v1Prefix: "/v1"
  });

  await client.actionRequest("sess_123", {
    action: "demo:hello",
    executor_id: "EXECUTOR_DEMO",
    params: {}
  });

  assert.ok(capturedUrl, "Expected a request URL to be captured.");
  const url = new URL(capturedUrl!);
  assert.equal(url.pathname, "/portal/v1/session/sess_123/actions/request");
});
