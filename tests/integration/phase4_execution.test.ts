import assert from "node:assert/strict";
import test from "node:test";

import { executionHandle, scrapPortalClient } from "../../packages/gf-sdk/src/scrap/index.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:18084";
const DEFAULT_EXECUTOR_ID = "JETSON-A";
const DEFAULT_ACTION = "demo:authorized";

const READY_TIMEOUT_MS = 10 * 60 * 1000;
const EXEC_TIMEOUT_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(
  fn: () => Promise<T>,
  isDone: (value: T) => boolean,
  timeoutMs: number,
  intervalMs: number
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T;

  while (true) {
    lastValue = await fn();
    if (isDone(lastValue)) {
      return lastValue;
    }
    if (Date.now() >= deadline) {
      const snapshot = JSON.stringify(lastValue);
      throw new Error(`Timed out after ${timeoutMs}ms. Last value: ${snapshot}`);
    }
    await sleep(intervalMs);
  }
}

function extractExecutorOk(executorResult: unknown): boolean | undefined {
  const reply = (executorResult as { reply?: { reply?: { ok?: unknown } } } | undefined)?.reply;
  return reply?.reply?.ok === true ? true : reply?.reply?.ok === false ? false : undefined;
}

test(
  "phase-4 execution end-to-end",
  { timeout: READY_TIMEOUT_MS + EXEC_TIMEOUT_MS + 30_000 },
  async () => {
    const baseUrl = process.env.PORTAL_BASE_URL ?? DEFAULT_BASE_URL;
    const adminToken = process.env.PORTAL_ADMIN_TOKEN ?? "";
    const executorId = process.env.EXECUTOR_ID ?? DEFAULT_EXECUTOR_ID;
    const action = process.env.ACTION ?? DEFAULT_ACTION;

    assert.ok(adminToken, "PORTAL_ADMIN_TOKEN is required for this staging demo");

    const client = scrapPortalClient({
      baseUrl,
      adminToken,
    });

    const session = await client.sessionStart({ session_kind: "scrap_native", units: 1 });
    assert.ok(session.session_id, "session_id missing from session start response");

    const readiness = await poll(
      () => client.sessionReady(session.session_id),
      (status) => status.ready === true && status.settlement_ok === true,
      READY_TIMEOUT_MS,
      POLL_INTERVAL_MS
    );

    assert.equal(readiness.ready, true);
    assert.equal(readiness.settlement_ok, true);

    const requested = await client.actionRequest(session.session_id, {
      action,
      executor_id: executorId,
      params: {}
    });
    assert.ok(requested.execution_id, "execution_id missing from action request response");

    await client.actionRun(session.session_id, requested.execution_id);

    const handle = executionHandle(client, session.session_id, requested.execution_id);
    const receipt = await handle.waitFor({ until: "DELIVERED" });

    assert.equal(receipt.session_id, session.session_id);
    assert.equal(receipt.execution_id, requested.execution_id);
    assert.equal(receipt.executor_id, executorId);
    assert.equal(receipt.status, "DELIVERED_TO_EXECUTOR");

    const executorOk = extractExecutorOk(receipt.executor_result);

    // Phase-4 transport is "deliver to bridge" (executor may not respond).
    // If we DO get a structured ok=false, fail. Otherwise accept.
    assert.notEqual(executorOk, false, "executor reported ok=false");

    // Optional: if you want to require a reply when present:
      if (executorOk !== undefined) {
        assert.equal(executorOk, true, "executor_result.reply.reply.ok should be true when present");
      }
  }
);
