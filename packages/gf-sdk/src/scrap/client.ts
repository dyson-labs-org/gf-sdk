import type { ExecutionReceipt } from "./types.js";

export interface ScrapPortalClientOptions {
  baseUrl?: string;
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

const DEFAULT_BASE_URL = "http://127.0.0.1:18084";
const DEFAULT_TIMEOUT_MS = 15000;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function readErrorBody(response: Response) {
  try {
    const text = await response.text();
    return text ? text.slice(0, 1000) : undefined;
  } catch {
    return undefined;
  }
}

export function scrapPortalClient(options?: ScrapPortalClientOptions): ScrapPortalClient {
  const baseUrl = normalizeBaseUrl(options?.baseUrl ?? process.env.PORTAL_BASE_URL ?? DEFAULT_BASE_URL);
  const adminToken =
    options?.adminToken ?? process.env.PORTAL_ADMIN_TOKEN ?? process.env.GF_PORTAL_ADMIN_TOKEN ?? undefined;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init?.headers);

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (adminToken) {
  headers.set("X-Admin-Token", adminToken);
  headers.set("X-Portal-Admin-Token", adminToken); // optional backward-compat
    }
    if (adminToken) {
  // print only length so we don't leak secrets
  console.log("[sdk] adminTokenLen=", adminToken.length);
}
  console.log("[sdk] headers include X-Admin-Token=", headers.get("X-Admin-Token") ? "yes" : "no");
  
  try {
    const url = joinUrl(baseUrl, path);
    const method = (init?.method ?? "GET").toUpperCase();

    console.log("[sdk] request:", method, url);
    console.log("[sdk] header keys:", Array.from(headers.keys()).join(", "));

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal
    });

      if (!response.ok) {
        const body = await readErrorBody(response);
        const www = response.headers.get("www-authenticate");
        const via = response.headers.get("via");

        console.log("[sdk] non-OK:", response.status, response.statusText, "www-authenticate=", www, "via=", via);

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
    return requestJson<SessionStartResponse>(`/portal/session/start?${params.toString()}`, { method: "POST" });
  }

  async function sessionReady(sessionId: string): Promise<SessionReadyResponse> {
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    return requestJson<SessionReadyResponse>(`/portal/session/${encodeURIComponent(sessionId)}/ready`);
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

    return requestJson<ActionRequestResponse>(`/portal/v1/session/${encodeURIComponent(sessionId)}/actions/request`, {
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
      throw new Error("admin token is required for actionRun.");
    }
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    if (!executionId) {
      throw new Error("executionId is required.");
    }

    return requestJson<ActionRunResponse>(
      `/portal/v1/session/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(executionId)}/run`,
      { method: "POST" }
    );
  }

  async function executionGet(sessionId: string, executionId: string): Promise<ExecutionReceipt> {
    if (!sessionId) {
      throw new Error("sessionId is required.");
    }
    if (!executionId) {
      throw new Error("executionId is required.");
    }

    return requestJson<ExecutionReceipt>(
  `/portal/v1/session/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(executionId)}`
  );
  }

  return {
    sessionStart,
    sessionReady,
    actionRequest,
    actionRun,
    executionGet
  };
}
