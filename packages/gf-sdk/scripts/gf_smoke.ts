import { PortalClient } from "../src/index.js";

const DEFAULT_BASE_URL = "https://btcpay.dyson-labs.com";
const DEFAULT_AMOUNT = "0.00001";
const DEFAULT_CURRENCY = "BTC";
const DEFAULT_MEMO = "gf-sdk smoke test";
const DEFAULT_TIMEOUT_S = 180;
const DEFAULT_ACTION = "sys:whoami";

type ActionResult = {
  actionId: string;
  mode: "v1" | "legacy";
  result: unknown;
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTimeoutSeconds(value: string | undefined) {
  if (value === undefined) return DEFAULT_TIMEOUT_S;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("GF_TIMEOUT_S must be a positive number of seconds.");
  }
  return parsed;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    const message = body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`;
    throw new Error(`Request failed: ${message}`);
  }

  return (await response.json()) as T;
}

async function tryActionV1(baseUrl: string, sessionId: string, adminToken: string, action: string): Promise<ActionResult | null> {
  const requestUrl = joinUrl(baseUrl, `/portal/v1/session/${encodeURIComponent(sessionId)}/actions/request`);
  const headers = new Headers({
    "X-Admin-Token": adminToken,
    "Content-Type": "application/json",
    Accept: "application/json"
  });

  const requestResponse = await fetch(requestUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ action })
  });

  if (requestResponse.status === 404 || requestResponse.status === 405) {
    return null;
  }

  if (!requestResponse.ok) {
    const body = await requestResponse.text();
    const message = body
      ? `${requestResponse.status} ${requestResponse.statusText}: ${body}`
      : `${requestResponse.status} ${requestResponse.statusText}`;
    throw new Error(`Action request failed: ${message}`);
  }

  const requestBody = (await requestResponse.json()) as Record<string, unknown>;
  const executionId =
    requestBody.execution_id ??
    requestBody.executionId ??
    requestBody.action_id ??
    requestBody.actionId ??
    requestBody.id;

  if (!executionId) {
    throw new Error("Action request succeeded but did not return an execution id.");
  }

  const runUrl = joinUrl(
    baseUrl,
    `/portal/v1/session/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(String(executionId))}/run`
  );
  const runResult = await requestJson<unknown>(runUrl, { method: "POST", headers });

  return { actionId: String(executionId), mode: "v1", result: runResult };
}

async function runActionLegacy(client: PortalClient, sessionId: string, adminToken: string, action: string): Promise<ActionResult> {
  const result = await client.executeAction(sessionId, action, adminToken);
  return { actionId: `legacy:${action}`, mode: "legacy", result };
}

async function runAction(
  client: PortalClient,
  baseUrl: string,
  sessionId: string,
  adminToken: string,
  action: string
): Promise<ActionResult> {
  const v1Result = await tryActionV1(baseUrl, sessionId, adminToken, action);
  if (v1Result) return v1Result;
  return runActionLegacy(client, sessionId, adminToken, action);
}

async function main() {
  const baseUrl = process.env.GF_PORTAL_BASE_URL ?? DEFAULT_BASE_URL;
  const adminToken = process.env.GF_PORTAL_ADMIN_TOKEN?.trim();
  const amount = process.env.GF_AMOUNT ?? DEFAULT_AMOUNT;
  const currency = process.env.GF_CURRENCY ?? DEFAULT_CURRENCY;
  const memo = process.env.GF_MEMO ?? DEFAULT_MEMO;
  const timeoutS = parseTimeoutSeconds(process.env.GF_TIMEOUT_S);

  const client = new PortalClient({ baseUrl });

  console.log(`portal_base_url: ${baseUrl}`);
  console.log(`admin_token: ${adminToken ? "set" : "unset"}`);
  console.log(`amount: ${amount} ${currency}`);
  console.log(`memo: ${memo}`);

  const session = await client.startSession({ amount, currency, memo });

  console.log(`session_id: ${session.session_id}`);
  console.log(`invoice_id: ${session.invoice_id ?? ""}`);
  console.log(`checkout_url: ${session.checkout_url ?? ""}`);

  const deadline = Date.now() + timeoutS * 1000;
  let ready = false;
  let settlementState = "unknown";

  while (Date.now() < deadline) {
    const status = await client.getSessionReady(session.session_id);
    ready = Boolean(status.ready);
    settlementState = status.settlement_state ?? "unknown";

    if (ready) break;
    await sleep(1000);
  }

  console.log(`ready: ${ready}`);
  console.log(`settlement_state: ${settlementState}`);

  if (!ready) {
    console.error("Timed out waiting for settlement. Pay the invoice via checkout_url before retrying.");
    process.exit(1);
  }

  if (adminToken) {
    const actionResult = await runAction(client, baseUrl, session.session_id, adminToken, DEFAULT_ACTION);
    console.log(`action_mode: ${actionResult.mode}`);
    console.log(`action_id: ${actionResult.actionId}`);
    console.log(`action_result: ${JSON.stringify(actionResult.result, null, 2)}`);
  } else {
    console.log("action_step: skipped (GF_PORTAL_ADMIN_TOKEN not set)");
  }
}

main().catch((error) => {
  console.error("gf-sdk smoke test failed:", error?.message ?? error);
  process.exit(1);
});
