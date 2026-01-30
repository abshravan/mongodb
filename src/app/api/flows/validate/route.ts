/**
 * /api/flows/validate
 *
 * POST — Validate a flow JSON without saving it.
 *
 * Returns { valid: true } or { valid: false, errors: [...] }.
 * Useful for real-time editor validation before persistence.
 */

import { NextRequest, NextResponse } from "next/server";
import { flowSchema, validateFlowStructure } from "@/lib/schemas/flow-schema";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, errors: ["Invalid JSON body."] },
      { status: 400 }
    );
  }

  // Schema validation.
  const parsed = flowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      valid: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      ),
    });
  }

  // Structural validation.
  const structuralErrors = validateFlowStructure(parsed.data);
  if (structuralErrors.length > 0) {
    return NextResponse.json({
      valid: false,
      errors: structuralErrors,
    });
  }

  return NextResponse.json({ valid: true, errors: [] });
}
