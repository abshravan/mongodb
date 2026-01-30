/**
 * /api/flows/[id]
 *
 * GET    — Retrieve a single flow by id.
 * PUT    — Update an existing flow (full replacement).
 * DELETE — Remove a flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { flowSchema, validateFlowStructure } from "@/lib/schemas/flow-schema";
import { getFlow, saveFlow, deleteFlow } from "@/lib/store";

type RouteContext = { params: Promise<{ id: string }> };

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const flow = getFlow(id);

  if (!flow) {
    return NextResponse.json(
      { error: `Flow "${id}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ flow });
}

// ── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = flowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Ensure the body id matches the URL id.
  if (parsed.data.id !== id) {
    return NextResponse.json(
      { error: `Body id "${parsed.data.id}" does not match URL id "${id}".` },
      { status: 400 }
    );
  }

  const structuralErrors = validateFlowStructure(parsed.data);
  if (structuralErrors.length > 0) {
    return NextResponse.json(
      { error: "Flow structure invalid.", details: structuralErrors },
      { status: 422 }
    );
  }

  saveFlow(parsed.data);

  return NextResponse.json({ message: "Flow updated.", flow: parsed.data });
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  const deleted = deleteFlow(id);

  if (!deleted) {
    return NextResponse.json(
      { error: `Flow "${id}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: `Flow "${id}" deleted.` });
}
