/**
 * /api/execute
 *
 * POST — Execute a flow with user-provided input.
 *
 * Request body:
 *   {
 *     flowId: string,       // id of a stored flow (or inline flow)
 *     input: object,        // key-value pairs fed into the flow state
 *     flow?: Flow           // optional inline flow (skips store lookup)
 *   }
 *
 * Response:
 *   {
 *     run: Run              // execution result with path, outputs, timestamps
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { flowSchema, validateFlowStructure } from "@/lib/schemas/flow-schema";
import { getFlow } from "@/lib/store";
import { saveRun } from "@/lib/store";
import { executeFlow } from "@/lib/engine/execute-flow";
import type { Flow } from "@/types/flow";

const executeRequestSchema = z.object({
  flowId: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  flow: flowSchema.optional(),
});

export async function POST(request: NextRequest) {
  // ── Parse request ─────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = executeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { flowId, input, flow: inlineFlow } = parsed.data;

  // ── Resolve flow ──────────────────────────────────────────────────────
  let flow: Flow | undefined;

  if (inlineFlow) {
    // Validate structural integrity of inline flow.
    const structuralErrors = validateFlowStructure(inlineFlow);
    if (structuralErrors.length > 0) {
      return NextResponse.json(
        { error: "Inline flow structure invalid.", details: structuralErrors },
        { status: 422 }
      );
    }
    flow = inlineFlow as Flow;
  } else {
    flow = getFlow(flowId);
  }

  if (!flow) {
    return NextResponse.json(
      { error: `Flow "${flowId}" not found.` },
      { status: 404 }
    );
  }

  // ── Execute ───────────────────────────────────────────────────────────
  try {
    const run = await executeFlow(flow, input);
    saveRun(run);
    return NextResponse.json({ run });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown execution error.";
    return NextResponse.json(
      { error: "Flow execution failed.", details: message },
      { status: 500 }
    );
  }
}
