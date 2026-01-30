/**
 * /api/flows
 *
 * POST — Create a new flow (or overwrite by id).
 * GET  — List all stored flows.
 */

import { NextRequest, NextResponse } from "next/server";
import { flowSchema, validateFlowStructure } from "@/lib/schemas/flow-schema";
import { saveFlow, getAllFlows } from "@/lib/store";

// ── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // Schema validation.
  const parsed = flowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Structural validation.
  const structuralErrors = validateFlowStructure(parsed.data);
  if (structuralErrors.length > 0) {
    return NextResponse.json(
      { error: "Flow structure invalid.", details: structuralErrors },
      { status: 422 }
    );
  }

  saveFlow(parsed.data);

  return NextResponse.json(
    { message: "Flow saved.", flow: parsed.data },
    { status: 201 }
  );
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const flows = getAllFlows();
  return NextResponse.json({ flows });
}
