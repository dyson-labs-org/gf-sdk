export type ExecutionStatus =
  | "TOKEN_ISSUED"
  | "DISPATCHED"
  | "DELIVERED_TO_EXECUTOR"
  | "QUEUED"
  | "RETRYING"
  | "PROOF_PENDING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED";

export interface ExecutionReceipt {
  session_id: string;
  execution_id: string;
  executor_id: string;
  action: string;
  status: ExecutionStatus;
  createdAt?: string;
  updatedAt?: string;
  token?: unknown;
  delivery?: unknown;
  executor_result?: unknown;
  queue?: {
    state: "QUEUED" | "RETRYING";
    attempt?: number;
    next_attempt_at?: string;
    last_error?: string;
  };
  [k: string]: unknown;
}

export type ExecutionPhase = "PENDING" | "QUEUED" | "DELIVERED" | "DONE" | "ERROR";

export function classifyExecution(receipt: ExecutionReceipt): ExecutionPhase {
  switch (receipt.status) {
    case "TOKEN_ISSUED":
    case "DISPATCHED":
    case "PROOF_PENDING":
      return "PENDING";
    case "QUEUED":
    case "RETRYING":
      return "QUEUED";
    case "DELIVERED_TO_EXECUTOR":
      return "DELIVERED";
    case "COMPLETED":
      return "DONE";
    case "FAILED":
    case "EXPIRED":
      return "ERROR";
    default:
      return "PENDING";
  }
}
