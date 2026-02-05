export type PortalHealth = {
  status: string;
  service?: string;
  time?: string;
  env?: string;
  [k: string]: unknown;
};

export type PortalSessionStart = {
  amount: string | number;
  currency?: string;
  memo?: string;
  sessionId?: string;
};

export type PortalSessionStartResponse = {
  session_id: string;
  invoice_id: string;
  checkout_url?: string;
  [k: string]: unknown;
};

export type PortalSessionReady = {
  session_id: string;
  ready: boolean;
  settlement_state?: string;
  [k: string]: unknown;
};

export type PortalActionResult = {
  session_id: string;
  state?: string;
  result?: unknown;
  [k: string]: unknown;
};

const DEFAULT_PORTAL_BASE_URL = "http://127.0.0.1:18083";
const DEFAULT_TIMEOUT_MS = 15000;

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env?.[key];
}

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

export class PortalClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(opts?: { baseUrl?: string; timeoutMs?: number }) {
    const baseUrl = opts?.baseUrl ?? readEnv("GF_PORTAL_BASE_URL") ?? DEFAULT_PORTAL_BASE_URL;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private buildUrl(path: string) {
    return joinUrl(this.baseUrl, path);
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers = new Headers(init?.headers);

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    try {
      const response = await fetch(this.buildUrl(path), {
        ...init,
        signal: controller.signal,
        headers
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        const message = body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`;
        throw new Error(`Portal request failed: ${message}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getHealth(): Promise<PortalHealth> {
    return this.requestJson<PortalHealth>("/portal/health");
  }

  async startSession(options: PortalSessionStart): Promise<PortalSessionStartResponse> {
    const { amount, currency, memo, sessionId } = options;

    if (amount === undefined || amount === null || amount === "") {
      throw new Error("Portal session start requires an amount.");
    }

    const amountValue =
      typeof amount === "number"
        ? Number.isFinite(amount)
          ? amount.toString()
          : ""
        : amount.toString().trim();

    if (!amountValue) {
      throw new Error("Portal session start amount must be a finite number or non-empty string.");
    }

    const params = new URLSearchParams({ amount: amountValue, currency: currency ?? "BTC" });
    if (memo) params.set("memo", memo);
    if (sessionId) params.set("session_id", sessionId);

    return this.requestJson<PortalSessionStartResponse>(`/portal/session/start?${params.toString()}`, { method: "POST" });
  }

  async getSessionReady(sessionId: string): Promise<PortalSessionReady> {
    if (!sessionId) {
      throw new Error("Portal session id is required.");
    }

    return this.requestJson<PortalSessionReady>(`/portal/session/${encodeURIComponent(sessionId)}/ready`);
  }

  async executeAction(sessionId: string, action: string, adminToken: string): Promise<PortalActionResult> {
    if (!sessionId) {
      throw new Error("Portal session id is required.");
    }
    if (!action) {
      throw new Error("Portal action is required.");
    }
    if (!adminToken) {
      throw new Error("Portal admin token is required.");
    }

    return this.requestJson<PortalActionResult>(`/portal/session/${encodeURIComponent(sessionId)}/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken
      },
      body: JSON.stringify({ action })
    });
  }
}
