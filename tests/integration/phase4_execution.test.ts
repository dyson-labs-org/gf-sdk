import assert from "node:assert/strict";
import test from "node:test";

import { PortalClient } from "../../packages/gf-sdk/src/index.js";
import { executionHandle, scrapPortalClient } from "../../packages/gf-sdk/src/scrap/index.js";

const DEFAULT_EXECUTOR_ID = "JETSON-A";
const DEFAULT_ACTION = "demo:authorized";
const DEFAULT_API_PREFIX = "/portal";

const READY_TIMEOUT_MS = 10 * 60 * 1000;
const EXEC_TIMEOUT_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;

const INTEGRATION_SKIP_MESSAGE =
  "Integration tests require a reachable SCRAP Portal on a VPS. Set GF_PORTAL_BASE_URL to https://btcpay.dyson-labs.com.";
const ADMIN_SKIP_MESSAGE =
  "Admin dispatch requires PORTAL_ADMIN_TOKEN and GF_PORTAL_V1_PREFIX. Skipping admin-only integration test.";

function normalizeApiPrefix(apiPrefix: string | undefined) {
  const trimmed = (apiPrefix ?? "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

function joinUrl(baseUrl: string, ...parts: Array<string | undefined>) {
  const base = baseUrl.replace(/\/+$/, "");
  const cleaned = parts
    .filter((part): part is string => Boolean(part && part.length > 0))
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter((part) => part.length > 0);

  if (cleaned.length === 0) {
    return base;
  }

  return `${base}/${cleaned.join("/")}`;
}

function assertRemoteBaseUrl(baseUrl: string) {
  if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
    throw new Error("Local portal URLs are not supported. Set GF_PORTAL_BASE_URL to https://btcpay.dyson-labs.com.");
  }
}

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

const baseUrl = process.env.GF_PORTAL_BASE_URL?.trim();
const adminToken = process.env.PORTAL_ADMIN_TOKEN?.trim() ?? process.env.GF_PORTAL_ADMIN_TOKEN?.trim();
const apiPrefix = normalizeApiPrefix(process.env.GF_PORTAL_API_PREFIX ?? DEFAULT_API_PREFIX);
const v1Prefix = process.env.GF_PORTAL_V1_PREFIX?.trim();

const executorId = process.env.EXECUTOR_ID ?? DEFAULT_EXECUTOR_ID;
const action = process.env.ACTION ?? DEFAULT_ACTION;

const skipSessionCreation = baseUrl ? undefined : INTEGRATION_SKIP_MESSAGE;
const skipAdminDispatch =
  baseUrl && adminToken && v1Prefix ? undefined : baseUrl ? ADMIN_SKIP_MESSAGE : INTEGRATION_SKIP_MESSAGE;

async function ensureHealth(
  baseUrlValue: string,
  apiPrefixValue: string,
  t: { skip: (reason?: string) => void }
) {
  const url = joinUrl(baseUrlValue, apiPrefixValue, "/health");
  try {
    const response = await fetch(url);
    if (!response.ok) {
      t.skip(`Integration health check failed: ${response.status} ${response.statusText} at ${url}`);
    }
  } catch (error) {
    t.skip(`Integration health check failed at ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


test(
  "remote session creation (no admin token)",
  { timeout: 60_000, skip: skipSessionCreation },
  async (t) => {
    assert.ok(baseUrl, INTEGRATION_SKIP_MESSAGE);
    assertRemoteBaseUrl(baseUrl);
    await ensureHealth(baseUrl, apiPrefix, t);

    const client = new PortalClient({ baseUrl, apiPrefix });

    const session = await client.startSession({
      amount: "0.00001",
      currency: "BTC",
      memo: "gf-sdk integration test"
    });

    assert.ok(session.session_id, "session_id missing from session start response");
    assert.ok(session.checkout_url, "checkout_url missing from session start response");
  }
);

test(
  "admin dispatch and execution (requires admin token)",
  { timeout: READY_TIMEOUT_MS + EXEC_TIMEOUT_MS + 30_000, skip: skipAdminDispatch },
  async (t) => {
    assert.ok(baseUrl, INTEGRATION_SKIP_MESSAGE);
    assert.ok(adminToken, ADMIN_SKIP_MESSAGE);
    assert.ok(v1Prefix, ADMIN_SKIP_MESSAGE);
    assertRemoteBaseUrl(baseUrl);
    await ensureHealth(baseUrl, apiPrefix,t);

    const client = scrapPortalClient({
      baseUrl,
      apiPrefix,
      v1Prefix,
      adminToken
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
