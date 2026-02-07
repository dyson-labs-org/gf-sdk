import type { ExecutionReceipt } from "./types.js";

export interface ScrapPortalClientOptions {
  baseUrl?: string;
  apiPrefix?: string;
  v1Prefix?: string;
  adminToken?: string;
  timeoutMs?: number;
}

export interface SessionStartOptions {
  session_kind: "scrap_native";
  units: number;
}

export interface SessionStartResponse {
  session_id: string;
  [k: string]: unknown;
}

export interface SessionReadyResponse {
  ready: boolean;
  settlement_ok?: boolean;
  settlement_state?: string;
  session_id?: string;
  [k: string]: unknown;
}

export interface ActionRequestOptions {
  action: string;
  executor_id: string;
  params: Record<string, unknown>;
}

export interface ActionRequestResponse {
  execution_id: string;
  status?: string;
  session_id?: string;
  [k: string]: unknown;
}

export interface ActionRunResponse {
  execution_id: string;
  status?: string;
  session_id?: string;
  delivered?: boolean;
  [k: string]: unknown;
}

export interface ScrapPortalClient {
  sessionStart(options: SessionStartOptions): Promise<SessionStartResponse>;
  sessionReady(sessionId: string): Promise<SessionReadyResponse>;
  actionRequest(sessionId: string, options: ActionRequestOptions): Promise<ActionRequestResponse>;
  actionRun(sessionId: string, executionId: string): Promise<ActionRunResponse>;
  executionGet(sessionId: string, executionId: string): Promise<ExecutionReceipt>;
}

const DEFAULT_BASE_URL = "https://btcpay.dyson-labs.com";
const DEFAULT_API_PREFIX = "/portal";
const DEFAULT_V1_PREFIX = "/v1";
const DEFAULT_TIMEOUT_MS = 15000;

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env?.[key];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizeApiPrefix(apiPrefix: string | undefined) {
  const trimmed = (apiPrefix ?? "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

function normalizeV1Prefix(v1Prefix: string | undefined) {
  const trimmed = (v1Prefix ?? "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/^\/+|\/+$/g, "");
  const normalizedWithSlash = normalized ? `/${normalized}` : "";
  if (!normalizedWithSlash) return "";
  if (trimmed.includes("/portal") || normalizedWithSlash.includes("/portal")) {
    throw new Error(
      "GF_PORTAL_V1_PREFIX must be relative (e.g. '/v1'), not '/portal/v1'. It is appended to GF_PORTAL_API_PREFIX."
    );
  }
  return normalizedWithSlash;
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

async function readErrorBody(response: Response) {
  try {
    const text = await response.text();
    return text ? text.slice(0, 1000) : undefined;
  } catch {
    return undefined;
  }
}

function adminTokenRequiredMessage(methodName: string) {
  return `Admin token is required for ${methodName}. This method is admin-only. Invoice creation does not require an admin token.`;
}

export function scrapPortalClient(options?: ScrapPortalClientOptions): ScrapPortalClient {
  const baseUrl = normalizeBaseUrl(
    options?.baseUrl ?? readEnv("GF_PORTAL_BASE_URL") ?? readEnv("PORTAL_BASE_URL") ?? DEFAULT_BASE_URL
  );
  const apiPrefix = normalizeApiPrefix(
    options?.apiPrefix ?? readEnv("GF_PORTAL_API_PREFIX") ?? DEFAULT_API_PREFIX
  );
  const v1Prefix = normalizeV1Prefix(
    options?.v1Prefix ?? readEnv("GF_PORTAL_V1_PREFIX") ?? DEFAULT_V1_PREFIX
  );
  const adminToken = options?.adminToken ?? readEnv("PORTAL_ADMIN_TOKEN") ?? readEnv("GF_PORTAL_ADMIN_TOKEN");
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  function buildApiUrl(path: string) {
    return joinUrl(baseUrl, apiPrefix, path);
  }

  function buildV1Url(path: string) {
    return joinUrl(baseUrl, apiPrefix, v1Prefix, path);
  }

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init?.headers);

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        const message = body
          ? `${response.status} ${response.statusText}: ${body}`
          : `${response.status} ${response.statusText}`;
        throw new Error(`Portal request failed: ${message}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function sessionStart(options: SessionStartOptions): Promise<SessionStartResponse> {
    const params = new URLSearchParams({
      session_kind: options.session_kind,
      units: String(options.units)
    });
    return requestJson<SessionStartResponse>(buildApiUrl(`/session/start?${params.toString()}`), { method: "POST" });
  }

  async function sessionReady(sessionId: string): Promise<SessionReadyResponse> {
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    return requestJson<SessionReadyResponse>(buildApiUrl(`/session/${encodeURIComponent(sessionId)}/ready`));
  }

  async function actionRequest(sessionId: string, options: ActionRequestOptions): Promise<ActionRequestResponse> {
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    if (!options.action) {
      throw new Error("action is required.");
    }
    if (!options.executor_id) {
      throw new Error("executor_id is required.");
    }

    return requestJson<ActionRequestResponse>(buildV1Url(`/session/${encodeURIComponent(sessionId)}/actions/request`), {
      method: "POST",
      body: JSON.stringify({
        action: options.action,
        executor_id: options.executor_id,
        params: options.params
      })
    });
  }

  /**
   * Demo-only: explicitly dispatches a requested execution. Requires admin token.
   */
  async function actionRun(sessionId: string, executionId: string): Promise<ActionRunResponse> {
    if (!adminToken) {
      throw new Error(adminTokenRequiredMessage("actionRun"));
    }
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    if (!executionId) {
      throw new Error("executionId is required.");
    }

    return requestJson<ActionRunResponse>(buildV1Url(`/session/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(executionId)}/run`), {
      method: "POST",
      headers: {
        "X-Admin-Token": adminToken,
        "X-Portal-Admin-Token": adminToken // optional backward-compat
      }
    });
  }

  async function executionGet(sessionId: string, executionId: string): Promise<ExecutionReceipt> {
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    if (!executionId) {
      throw new Error("executionId is required.");
    }

    return requestJson<ExecutionReceipt>(buildV1Url(`/session/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(executionId)}`));
  }

  return {
    sessionStart,
    sessionReady,
    actionRequest,
    actionRun,
    executionGet
  };
}
