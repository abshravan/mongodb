/**
 * Core type definitions for the flow orchestration system.
 *
 * Terminology:
 *  - Flow: A directed graph of nodes and edges that defines a prompt orchestration pipeline.
 *  - Node: A single execution unit (prompt, router, start, or end).
 *  - Edge: A directed connection between two nodes, optionally carrying a condition.
 *  - Run:  A single execution of a flow, capturing the path and per-node outputs.
 */

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export const NODE_TYPES = ["start", "end", "prompt", "router"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

/** Base fields shared by every node. */
interface NodeBase {
  id: string;
  type: NodeType;
  label: string;
  /** Visual position in the editor (pixels). */
  position: { x: number; y: number };
}

/** Entry point of the flow – exactly one per flow. */
export interface StartNode extends NodeBase {
  type: "start";
}

/** Terminal node – at least one per flow. */
export interface EndNode extends NodeBase {
  type: "end";
}

/**
 * Prompt execution node.
 * `promptTemplate` may contain {{variable}} placeholders resolved at runtime.
 * `outputKey` names the state field where the LLM response is stored.
 */
export interface PromptNode extends NodeBase {
  type: "prompt";
  promptTemplate: string;
  outputKey: string;
}

/**
 * Router node – does NOT call the LLM itself.
 * It evaluates conditions on outgoing edges to decide the next node.
 */
export interface RouterNode extends NodeBase {
  type: "router";
}

export type FlowNode = StartNode | EndNode | PromptNode | RouterNode;

// ---------------------------------------------------------------------------
// Edge types
// ---------------------------------------------------------------------------

export interface Edge {
  id: string;
  source: string; // node id
  target: string; // node id
  /**
   * Optional condition expression, e.g. `intent == "sales"` or `confidence > 0.8`.
   * Only evaluated when the source is a router node.
   * When absent the edge is unconditional.
   */
  condition?: string;
  /** Human-readable label shown in the editor. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Flow definition
// ---------------------------------------------------------------------------

export interface Flow {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: Edge[];
  version: number;
}

// ---------------------------------------------------------------------------
// Execution result
// ---------------------------------------------------------------------------

export interface NodeOutput {
  nodeId: string;
  nodeLabel: string;
  promptText?: string;   // resolved prompt (after template interpolation)
  llmResponse?: string;  // raw LLM output
  outputKey?: string;    // state key written to
}

export interface Run {
  id: string;
  flowId: string;
  input: Record<string, unknown>;
  /** Ordered list of node IDs that were executed. */
  path: string[];
  /** Per-node execution details, keyed by node ID. */
  outputs: Record<string, NodeOutput>;
  /** ISO-8601 timestamp. */
  createdAt: string;
}
