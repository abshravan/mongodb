import { z } from "zod";
import { NODE_TYPES } from "@/types/flow";

// ---------------------------------------------------------------------------
// Zod schemas – used to validate flow JSON at API boundaries.
// ---------------------------------------------------------------------------

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const baseNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  position: positionSchema,
});

const startNodeSchema = baseNodeSchema.extend({
  type: z.literal("start"),
});

const endNodeSchema = baseNodeSchema.extend({
  type: z.literal("end"),
});

const promptNodeSchema = baseNodeSchema.extend({
  type: z.literal("prompt"),
  promptTemplate: z.string().min(1),
  outputKey: z.string().min(1),
});

const routerNodeSchema = baseNodeSchema.extend({
  type: z.literal("router"),
});

const flowNodeSchema = z.discriminatedUnion("type", [
  startNodeSchema,
  endNodeSchema,
  promptNodeSchema,
  routerNodeSchema,
]);

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  condition: z.string().optional(),
  label: z.string().optional(),
});

export const flowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(flowNodeSchema).min(1),
  edges: z.array(edgeSchema),
  version: z.number().int().nonnegative(),
});

export type FlowInput = z.infer<typeof flowSchema>;

// ---------------------------------------------------------------------------
// Structural validation beyond schema shape.
// Returns an array of human-readable error strings (empty = valid).
// ---------------------------------------------------------------------------

export function validateFlowStructure(flow: FlowInput): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  // Exactly one start node.
  const startNodes = flow.nodes.filter((n) => n.type === "start");
  if (startNodes.length !== 1) {
    errors.push(`Flow must have exactly 1 start node, found ${startNodes.length}.`);
  }

  // At least one end node.
  const endNodes = flow.nodes.filter((n) => n.type === "end");
  if (endNodes.length === 0) {
    errors.push("Flow must have at least 1 end node.");
  }

  // Edges reference existing nodes.
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references unknown source node "${edge.source}".`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references unknown target node "${edge.target}".`);
    }
  }

  // Every non-end node must have at least one outgoing edge.
  for (const node of flow.nodes) {
    if (node.type === "end") continue;
    const outgoing = flow.edges.filter((e) => e.source === node.id);
    if (outgoing.length === 0) {
      errors.push(`Node "${node.id}" (${node.type}) has no outgoing edges.`);
    }
  }

  // Router nodes: all outgoing edges must carry a condition.
  for (const node of flow.nodes) {
    if (node.type !== "router") continue;
    const outgoing = flow.edges.filter((e) => e.source === node.id);
    for (const edge of outgoing) {
      if (!edge.condition || edge.condition.trim() === "") {
        errors.push(
          `Router node "${node.id}": outgoing edge "${edge.id}" is missing a condition.`
        );
      }
    }
  }

  // Prompt node outputKeys must be unique within the flow.
  const outputKeys = flow.nodes
    .filter((n): n is Extract<typeof n, { type: "prompt" }> => n.type === "prompt")
    .map((n) => n.outputKey);
  const seen = new Set<string>();
  for (const key of outputKeys) {
    if (seen.has(key)) {
      errors.push(`Duplicate outputKey "${key}" – each prompt node must write to a unique key.`);
    }
    seen.add(key);
  }

  return errors;
}
