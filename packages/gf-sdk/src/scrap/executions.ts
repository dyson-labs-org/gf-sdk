import { classifyExecution, type ExecutionReceipt } from "./types.js";
import type { ScrapPortalClient } from "./client.js";

export type WaitUntil = "DELIVERED" | "COMPLETED" | "FINAL";

export interface WaitOptions {
  until?: WaitUntil;
  timeoutMs?: number;
  pollIntervalMs?: number;
  returnOnQueued?: boolean;
  onUpdate?(receipt: ExecutionReceipt): void;
}

export interface ExecutionHandle {
  sessionId: string;
  executionId: string;
  get(): Promise<ExecutionReceipt>;
  waitFor(opts?: WaitOptions): Promise<ExecutionReceipt>;
}

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_POLL_INTERVAL_MS = 750;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldStop(status: ExecutionReceipt["status"], until: WaitUntil): boolean {
  if (until === "DELIVERED") {
    return status === "DELIVERED_TO_EXECUTOR" || status === "COMPLETED" || status === "FAILED" || status === "EXPIRED";
  }
  return status === "COMPLETED" || status === "FAILED" || status === "EXPIRED";
}

export function executionHandle(
  client: ScrapPortalClient,
  sessionId: string,
  executionId: string
): ExecutionHandle {
  return {
    sessionId,
    executionId,
    async get() {
      return client.executionGet(sessionId, executionId);
    },
    async waitFor(options?: WaitOptions) {
      const until = options?.until ?? "DELIVERED";
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
      const returnOnQueued = options?.returnOnQueued ?? false;
      const onUpdate = options?.onUpdate;
      const deadline = Date.now() + timeoutMs;

      let lastReceipt: ExecutionReceipt | undefined;

      while (true) {
        lastReceipt = await client.executionGet(sessionId, executionId);
        onUpdate?.(lastReceipt);

        if (returnOnQueued && classifyExecution(lastReceipt) === "QUEUED") {
          return lastReceipt;
        }

        if (shouldStop(lastReceipt.status, until)) {
          return lastReceipt;
        }

        if (Date.now() >= deadline) {
          if (lastReceipt) {
            const snapshot = JSON.stringify(lastReceipt);
            throw new Error(`Timed out waiting for execution ${executionId}. Last receipt: ${snapshot}`);
          }
          throw new Error(`Timed out waiting for execution ${executionId}.`);
        }

        await sleep(pollIntervalMs);
      }
    }
  };
}
