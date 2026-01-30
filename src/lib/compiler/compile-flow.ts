/**
 * Flow Compiler
 *
 * Translates a Flow JSON definition into a runnable LangGraph StateGraph.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Compilation strategy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. **State annotation** – We define a LangGraph `Annotation` whose channels
 *    include:
 *      • `input`   – the user-provided input object
 *      • one key per PromptNode's `outputKey`
 *      • `_path`   – accumulator that records every visited node id
 *      • `_outputs`– accumulator that captures per-node execution details
 *
 * 2. **Node mapping** – Each FlowNode becomes a LangGraph node:
 *      • `start`  → pass-through (copies input into state)
 *      • `end`    → pass-through (returns final state)
 *      • `prompt` → calls the LLM, writes result to its `outputKey`
 *      • `router` → no-op node (routing is handled by conditional edges)
 *
 * 3. **Edge mapping**
 *      • Unconditional edges → `graph.addEdge(source, target)`
 *      • Conditional edges (from router nodes) →
 *        `graph.addConditionalEdges(routerNodeId, routingFn, destinationMap)`
 *        where `routingFn` evaluates each outgoing edge's condition against the
 *        current state and returns the id of the first matching target.
 *
 * 4. **Entry / Finish**
 *      • The start node id is set as the graph entry point.
 *      • Every end node id is registered as a finish point.
 *
 * 5. **Compilation** – `graph.compile()` produces a `CompiledStateGraph` that
 *    can be invoked with `{ input: { ... } }`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

import type { Flow, FlowNode, Edge, PromptNode, NodeOutput } from "@/types/flow";
import { evaluateCondition } from "@/lib/conditions/parser";

// LangGraph's StateGraph uses strict string-literal types for node names.
// Since our node IDs are dynamic (user-defined strings), we cast at the
// API boundary. All internal logic remains fully typed.

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Shape of the graph state — built dynamically per-flow. */
export interface FlowState {
  input: Record<string, unknown>;
  [outputKey: string]: unknown;
  _path: string[];
  _outputs: Record<string, NodeOutput>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CompileOptions {
  /** OpenAI-compatible model name, defaults to "gpt-4o-mini". */
  model?: string;
  /** Base URL for the LLM API (for local or proxy endpoints). */
  baseUrl?: string;
  /** API key – read from env if not supplied. */
  apiKey?: string;
  /** Temperature for LLM calls, defaults to 0. */
  temperature?: number;
}

/**
 * Compiles a Flow definition into a runnable LangGraph.
 * Returns the compiled graph and metadata needed by the execution engine.
 */
export function compileFlow(flow: Flow, options: CompileOptions = {}) {
  const {
    model = "gpt-4o-mini",
    baseUrl,
    apiKey,
    temperature = 0,
  } = options;

  // ── 1. Build LLM client ──────────────────────────────────────────────
  const llm = new ChatOpenAI({
    modelName: model,
    temperature,
    ...(baseUrl ? { configuration: { baseURL: baseUrl } } : {}),
    ...(apiKey ? { openAIApiKey: apiKey } : {}),
  });

  // ── 2. Derive state annotation ───────────────────────────────────────
  // LangGraph's Annotation API expects compile-time channel definitions.
  // We use a generic Record-based state and manage keys ourselves.

  const GraphAnnotation = Annotation.Root({
    input: Annotation<Record<string, unknown>>({
      reducer: (_prev, next) => next,
      default: () => ({}),
    }),
    _path: Annotation<string[]>({
      reducer: (prev, next) => [...prev, ...next],
      default: () => [],
    }),
    _outputs: Annotation<Record<string, NodeOutput>>({
      reducer: (prev, next) => ({ ...prev, ...next }),
      default: () => ({}),
    }),
    // Dynamic output keys are stored in a generic bucket.
    nodeResults: Annotation<Record<string, unknown>>({
      reducer: (prev, next) => ({ ...prev, ...next }),
      default: () => ({}),
    }),
  });

  // ── 3. Build graph ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph(GraphAnnotation) as any;

  const nodeMap = new Map<string, FlowNode>();
  for (const node of flow.nodes) {
    nodeMap.set(node.id, node);
  }

  // Group edges by source.
  const edgesBySource = new Map<string, Edge[]>();
  for (const edge of flow.edges) {
    const list = edgesBySource.get(edge.source) ?? [];
    list.push(edge);
    edgesBySource.set(edge.source, list);
  }

  // ── 3a. Add nodes ────────────────────────────────────────────────────
  for (const node of flow.nodes) {
    if (node.type === "end") continue; // END is built-in in LangGraph

    if (node.type === "start") {
      graph.addNode(node.id, () => {
        return {
          _path: [node.id],
        };
      });
      continue;
    }

    if (node.type === "router") {
      graph.addNode(node.id, () => {
        return {
          _path: [node.id],
        };
      });
      continue;
    }

    if (node.type === "prompt") {
      const promptNode = node as PromptNode;
      graph.addNode(node.id, async (state: typeof GraphAnnotation.State) => {
        // Resolve template placeholders {{key}}.
        const resolvedPrompt = resolveTemplate(promptNode.promptTemplate, {
          ...state.input,
          ...state.nodeResults,
        });

        // Call LLM.
        const response = await llm.invoke([
          new HumanMessage(resolvedPrompt),
        ]);
        const content =
          typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);

        // Build execution trace entry.
        const output: NodeOutput = {
          nodeId: node.id,
          nodeLabel: node.label,
          promptText: resolvedPrompt,
          llmResponse: content,
          outputKey: promptNode.outputKey,
        };

        return {
          _path: [node.id],
          _outputs: { [node.id]: output },
          nodeResults: { [promptNode.outputKey]: content },
        };
      });
      continue;
    }
  }

  // ── 3b. Add edges ────────────────────────────────────────────────────
  // Set entry point.
  const startNode = flow.nodes.find((n) => n.type === "start");
  if (!startNode) throw new Error("Flow has no start node.");
  graph.setEntryPoint(startNode.id);

  for (const node of flow.nodes) {
    if (node.type === "end") continue;
    const outgoing = edgesBySource.get(node.id) ?? [];

    if (node.type === "router") {
      // Conditional edges: build routing function + destination map.
      const destinations: Record<string, string> = {};
      for (const edge of outgoing) {
        const targetNode = nodeMap.get(edge.target);
        if (!targetNode) continue;
        const targetKey =
          targetNode.type === "end" ? END : edge.target;
        destinations[edge.target] = targetKey;
      }

      graph.addConditionalEdges(
        node.id,
        (state: typeof GraphAnnotation.State) => {
          const combinedState: Record<string, unknown> = {
            ...state.input,
            ...state.nodeResults,
          };
          for (const edge of outgoing) {
            if (edge.condition && evaluateCondition(edge.condition, combinedState)) {
              return edge.target;
            }
          }
          // Fallback: if no condition matches, pick the first unconditional
          // edge, or the last edge as default.
          const fallback = outgoing.find((e) => !e.condition) ?? outgoing[outgoing.length - 1];
          return fallback.target;
        },
        destinations
      );
    } else {
      // Non-router: simple edge(s). If there's exactly one outgoing edge,
      // add a direct edge. (Non-router nodes should have exactly one outgoing.)
      if (outgoing.length === 1) {
        const target = outgoing[0].target;
        const targetNode = nodeMap.get(target);
        if (targetNode?.type === "end") {
          graph.addEdge(node.id, END);
        } else {
          graph.addEdge(node.id, target);
        }
      }
    }
  }

  // ── 4. Compile ───────────────────────────────────────────────────────
  const compiled = graph.compile();

  return { compiled, nodeMap };
}

// ---------------------------------------------------------------------------
// Template resolution
// ---------------------------------------------------------------------------

/**
 * Replaces `{{key}}` placeholders with values from the state.
 * Supports dotted paths like `{{result.score}}`.
 */
function resolveTemplate(
  template: string,
  state: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmed = key.trim();
    const value = resolveNestedKey(trimmed, state);
    return value !== undefined ? String(value) : `{{${trimmed}}}`;
  });
}

function resolveNestedKey(
  key: string,
  obj: Record<string, unknown>
): unknown {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
