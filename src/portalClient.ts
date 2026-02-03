export type PortalHealth = {
  status: string;
  service?: string;
  time?: string;
  env?: string;
  [k: string]: unknown;
};

const DEFAULT_PORTAL_BASE_URL = "http://127.0.0.1:18083";
const DEFAULT_TIMEOUT_MS = 15000;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
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
    const baseUrl = opts?.baseUrl ?? process.env.GF_PORTAL_BASE_URL ?? DEFAULT_PORTAL_BASE_URL;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async getHealth(): Promise<PortalHealth> {
    const url = `${this.baseUrl}/portal/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        const message = body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`;
        throw new Error(`Portal health check failed: ${message}`);
      }

      return (await response.json()) as PortalHealth;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
