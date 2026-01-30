/**
 * Flow Execution Engine
 *
 * Accepts a Flow definition and user input, compiles the flow via LangGraph,
 * invokes it, and returns a structured Run result.
 */

import { v4 as uuidv4 } from "uuid";
import type { Flow, Run, NodeOutput } from "@/types/flow";
import { compileFlow, type CompileOptions } from "@/lib/compiler/compile-flow";

export interface ExecuteOptions extends CompileOptions {
  /** Override the run ID (useful for idempotency / testing). */
  runId?: string;
}

export async function executeFlow(
  flow: Flow,
  input: Record<string, unknown>,
  options: ExecuteOptions = {}
): Promise<Run> {
  const { compiled } = compileFlow(flow, options);

  const result = await compiled.invoke({
    input,
  });

  const path: string[] = result._path ?? [];
  const outputs: Record<string, NodeOutput> = result._outputs ?? {};

  return {
    id: options.runId ?? uuidv4(),
    flowId: flow.id,
    input,
    path,
    outputs,
    createdAt: new Date().toISOString(),
  };
}
