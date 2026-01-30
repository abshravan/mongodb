/**
 * Safe condition evaluator for router edges.
 *
 * Supported grammar (intentionally minimal):
 *   <expr>   ::= <ident> <op> <literal>
 *   <op>     ::= "==" | "!=" | ">" | ">=" | "<" | "<="
 *   <literal>::= quoted-string | number | "true" | "false"
 *   <ident>  ::= dotted key path, e.g. "intent" or "result.score"
 *
 * No eval(), no arbitrary code execution, no function calls.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Operator = "==" | "!=" | ">" | ">=" | "<" | "<=";

interface ParsedCondition {
  field: string;
  operator: Operator;
  value: string | number | boolean;
}

const OPERATORS: Operator[] = [">=", "<=", "!=", "==", ">", "<"];

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parseCondition(raw: string): ParsedCondition {
  const trimmed = raw.trim();

  let matchedOp: Operator | undefined;
  let opIndex = -1;

  for (const op of OPERATORS) {
    const idx = trimmed.indexOf(op);
    if (idx !== -1) {
      matchedOp = op;
      opIndex = idx;
      break;
    }
  }

  if (!matchedOp || opIndex === -1) {
    throw new ConditionParseError(
      `No valid operator found in condition: "${raw}". Supported: ${OPERATORS.join(", ")}`
    );
  }

  const field = trimmed.slice(0, opIndex).trim();
  const rawValue = trimmed.slice(opIndex + matchedOp.length).trim();

  if (!field || !rawValue) {
    throw new ConditionParseError(`Incomplete condition: "${raw}".`);
  }

  // Validate field name (alphanumeric + dots only).
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(field)) {
    throw new ConditionParseError(`Invalid field name: "${field}".`);
  }

  const value = parseLiteral(rawValue);
  return { field, operator: matchedOp, value };
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export function evaluateCondition(
  raw: string,
  state: Record<string, unknown>
): boolean {
  const { field, operator, value } = parseCondition(raw);
  const actual = resolveField(field, state);

  switch (operator) {
    case "==":
      return actual === value;
    case "!=":
      return actual !== value;
    case ">":
      return (actual as number) > (value as number);
    case ">=":
      return (actual as number) >= (value as number);
    case "<":
      return (actual as number) < (value as number);
    case "<=":
      return (actual as number) <= (value as number);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveField(
  field: string,
  state: Record<string, unknown>
): unknown {
  const parts = field.split(".");
  let current: unknown = state;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function parseLiteral(raw: string): string | number | boolean {
  // Boolean literals
  if (raw === "true") return true;
  if (raw === "false") return false;

  // Quoted string
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  // Number
  const num = Number(raw);
  if (!Number.isNaN(num)) return num;

  // Fallback: treat as unquoted string
  return raw;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ConditionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConditionParseError";
  }
}
