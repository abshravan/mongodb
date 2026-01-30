/**
 * In-memory store for flows and execution runs.
 *
 * This is intentionally simple — no persistence across server restarts.
 * Good enough for development, testing, and the prompt-flow IDE use case
 * where flows are also held client-side.
 */

import type { Flow, Run } from "@/types/flow";

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

const flows = new Map<string, Flow>();

export function getFlow(id: string): Flow | undefined {
  return flows.get(id);
}

export function getAllFlows(): Flow[] {
  return Array.from(flows.values());
}

export function saveFlow(flow: Flow): void {
  flows.set(flow.id, flow);
}

export function deleteFlow(id: string): boolean {
  return flows.delete(id);
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

const runs = new Map<string, Run[]>(); // keyed by flowId

export function saveRun(run: Run): void {
  const list = runs.get(run.flowId) ?? [];
  list.push(run);
  runs.set(run.flowId, list);
}

export function getRunsForFlow(flowId: string): Run[] {
  return runs.get(flowId) ?? [];
}

export function getRun(flowId: string, runId: string): Run | undefined {
  return (runs.get(flowId) ?? []).find((r) => r.id === runId);
}
