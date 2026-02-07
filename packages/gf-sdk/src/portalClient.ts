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

  // New portal shape
  invoice?: {
    amount?: string;
    currency?: string;
    expected_total_sats?: number;
  };

  // Backward/other shapes we’ve seen in the portal during iteration
  pricing?: {
    total_sats?: number;
    quoted_subtotal_sats?: number;
    platform_fee_bps?: number;
    platform_fee_sats?: number;
    currency?: string;
  };

  expectedTotalSats?: number;

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

const DEFAULT_PORTAL_BASE_URL = "https://btcpay.dyson-labs.com";
const DEFAULT_API_PREFIX = "/portal";
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

export class PortalClient {
  private baseUrl: string;
  private apiPrefix: string;
  private timeoutMs: number;

  constructor(opts?: { baseUrl?: string; apiPrefix?: string; timeoutMs?: number }) {
    const baseUrl = opts?.baseUrl ?? readEnv("GF_PORTAL_BASE_URL") ?? DEFAULT_PORTAL_BASE_URL;
    const apiPrefix = opts?.apiPrefix ?? readEnv("GF_PORTAL_API_PREFIX") ?? DEFAULT_API_PREFIX;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.apiPrefix = normalizeApiPrefix(apiPrefix);
    this.timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private buildApiUrl(path: string) {
    return joinUrl(this.baseUrl, this.apiPrefix, path);
  }

  private buildRootUrl(path: string) {
    return joinUrl(this.baseUrl, path);
  }

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers = new Headers(init?.headers);

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    try {
      const response = await fetch(url, {
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
    try {
      return await this.requestJson<PortalHealth>(this.buildRootUrl("/health"));
    } catch (error) {
      if (!this.apiPrefix) {
        throw error;
      }
      return this.requestJson<PortalHealth>(this.buildApiUrl("/health"));
    }
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

    return this.requestJson<PortalSessionStartResponse>(this.buildApiUrl(`/session/start?${params.toString()}`), {
      method: "POST"
    });
  }

  async getSessionReady(sessionId: string): Promise<PortalSessionReady> {
    if (!sessionId) {
      throw new Error("Portal session id is required.");
    }

    return this.requestJson<PortalSessionReady>(
      this.buildApiUrl(`/session/${encodeURIComponent(sessionId)}/ready`)
    );
  }

  async executeAction(sessionId: string, action: string, adminToken: string): Promise<PortalActionResult> {
    if (!sessionId) {
      throw new Error("Portal session id is required.");
    }
    if (!action) {
      throw new Error("Portal action is required.");
    }
    if (!adminToken) {
      throw new Error(adminTokenRequiredMessage("executeAction"));
    }

    return this.requestJson<PortalActionResult>(this.buildApiUrl(`/session/${encodeURIComponent(sessionId)}/exec`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
        "X-Portal-Admin-Token": adminToken
      },
      body: JSON.stringify({ action })
    });
  }
}
