"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge as RFEdge,
  type NodeTypes,
  MarkerType,
  type OnSelectionChangeParams,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { StartNode } from "@/components/nodes/StartNode";
import { EndNode } from "@/components/nodes/EndNode";
import { PromptNode } from "@/components/nodes/PromptNode";
import { RouterNode } from "@/components/nodes/RouterNode";
import { NodeEditorPanel } from "@/components/panels/NodeEditorPanel";
import { EdgeEditorPanel } from "@/components/panels/EdgeEditorPanel";
import { TestRunnerPanel } from "@/components/panels/TestRunnerPanel";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { ToastContainer, showToast } from "@/components/Toast";
import type { Flow, FlowNode, NodeType, Run } from "@/types/flow";

// ---------------------------------------------------------------------------
// React Flow node type registry
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  router: RouterNode,
};

// ---------------------------------------------------------------------------
// Defaults for new nodes
// ---------------------------------------------------------------------------

function createDefaultNode(type: NodeType, position: { x: number; y: number }): Node {
  const id = `${type}-${uuidv4().slice(0, 8)}`;
  const base = { id, position, type };

  switch (type) {
    case "start":
      return { ...base, data: { label: "Start" } };
    case "end":
      return { ...base, data: { label: "End" } };
    case "prompt":
      return {
        ...base,
        data: {
          label: "Prompt",
          promptTemplate: "",
          outputKey: `output_${id.slice(-4)}`,
        },
      };
    case "router":
      return { ...base, data: { label: "Router" } };
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

function serializeToFlow(
  flowName: string,
  flowId: string,
  version: number,
  rfNodes: Node[],
  rfEdges: RFEdge[]
): Flow {
  const nodes: FlowNode[] = rfNodes.map((n) => {
    const base = {
      id: n.id,
      type: n.type as NodeType,
      label: (n.data as Record<string, unknown>).label as string,
      position: { x: n.position.x, y: n.position.y },
    };

    if (n.type === "prompt") {
      return {
        ...base,
        type: "prompt" as const,
        promptTemplate:
          ((n.data as Record<string, unknown>).promptTemplate as string) ?? "",
        outputKey:
          ((n.data as Record<string, unknown>).outputKey as string) ?? "",
      };
    }

    return base as FlowNode;
  });

  const edges = rfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.data && (e.data as Record<string, unknown>).condition
      ? {
          condition: (e.data as Record<string, unknown>).condition as string,
          label: (e.data as Record<string, unknown>).condition as string,
        }
      : {}),
  }));

  return { id: flowId, name: flowName, nodes, edges, version };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function getFlowWarnings(rfNodes: Node[], rfEdges: RFEdge[]): string[] {
  const warnings: string[] = [];
  const startCount = rfNodes.filter((n) => n.type === "start").length;
  const endCount = rfNodes.filter((n) => n.type === "end").length;

  if (rfNodes.length === 0) return warnings;
  if (startCount === 0) warnings.push("No Start node");
  if (startCount > 1) warnings.push("Multiple Start nodes");
  if (endCount === 0) warnings.push("No End node");

  for (const node of rfNodes) {
    if (node.type === "end") continue;
    const outgoing = rfEdges.filter((e) => e.source === node.id);
    if (outgoing.length === 0) {
      const label = (node.data as Record<string, unknown>).label as string;
      warnings.push(`"${label}" has no outgoing edge`);
    }
  }

  for (const node of rfNodes) {
    if (node.type !== "prompt") continue;
    const d = node.data as Record<string, unknown>;
    if (!d.promptTemplate || (d.promptTemplate as string).trim() === "") {
      warnings.push(`"${d.label}" has empty prompt`);
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FlowEditor() {
  // ── Flow metadata ──
  const [flowName, setFlowName] = useState("Untitled Flow");
  const flowIdRef = useRef(uuidv4());
  const versionRef = useRef(1);

  // ── React Flow state ──
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  // ── Selection (store IDs, derive actual objects) ──
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Derive selected node/edge from arrays so edits are reflected immediately
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) ?? null : null),
    [edges, selectedEdgeId]
  );

  // ── Execution result ──
  const [lastRun, setLastRun] = useState<Run | null>(null);

  // ── Right panel mode ──
  const [panelMode, setPanelMode] = useState<"node" | "edge" | "test">("test");

  // ── Save state ──
  const [saving, setSaving] = useState(false);

  // ── Validation ──
  const warnings = useMemo(() => getFlowWarnings(nodes, edges), [nodes, edges]);

  // ── Connections ──
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: { condition: "" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // ── Selection change ── Only switch panel when something is selected.
  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (selNodes.length === 1) {
        setSelectedNodeId(selNodes[0].id);
        setSelectedEdgeId(null);
        setPanelMode("node");
      } else if (selEdges.length === 1) {
        setSelectedEdgeId(selEdges[0].id);
        setSelectedNodeId(null);
        setPanelMode("edge");
      } else {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        // Do NOT auto-switch to "test" — keep whatever panel was open.
      }
    },
    []
  );

  // ── Add node from toolbar ──
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const position = { x: 250 + Math.random() * 100, y: 100 + Math.random() * 200 };
      const newNode = createDefaultNode(type, position);
      setNodes((nds) => [...nds, newNode]);
      showToast(`Added ${type} node`, "info");
    },
    [setNodes]
  );

  // ── Delete node ──
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
      setPanelMode("test");
      showToast("Node deleted", "info");
    },
    [setNodes, setEdges]
  );

  // ── Delete edge ──
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setSelectedEdgeId(null);
      setPanelMode("test");
      showToast("Edge deleted", "info");
    },
    [setEdges]
  );

  // ── Update node data from panel ──
  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
    },
    [setNodes]
  );

  // ── Update edge data from panel ──
  const handleEdgeDataChange = useCallback(
    (edgeId: string, data: Record<string, unknown>) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                label: (data.condition as string) || undefined,
                data: { ...e.data, ...data },
              }
            : e
        )
      );
    },
    [setEdges]
  );

  // ── Serialize current flow ──
  const getCurrentFlow = useCallback((): Flow => {
    return serializeToFlow(
      flowName,
      flowIdRef.current,
      versionRef.current,
      nodes,
      edges
    );
  }, [flowName, nodes, edges]);

  // ── Save flow ──
  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const flow = getCurrentFlow();
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow),
      });
      if (!res.ok) {
        const err = await res.json();
        const detail = Array.isArray(err.details)
          ? err.details.join("; ")
          : err.details ?? "";
        showToast(`Save failed: ${err.error}. ${detail}`, "error");
        return;
      }
      versionRef.current += 1;
      showToast("Flow saved", "success");
    } finally {
      setSaving(false);
    }
  }, [getCurrentFlow, saving]);

  // ── Execute flow ──
  const handleExecute = useCallback(
    async (input: Record<string, unknown>) => {
      const flow = getCurrentFlow();
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId: flow.id, flow, input }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = typeof json.details === "string" ? json.details : JSON.stringify(json.details ?? "");
        showToast(`Execution failed: ${json.error}. ${detail}`, "error");
        return;
      }
      const run = json.run as Run;
      setLastRun(run);
      showToast(`Flow executed — ${run.path.length} steps`, "success");

      // Build execution order map.
      const orderMap = new Map<string, number>();
      run.path.forEach((id, i) => orderMap.set(id, i + 1));

      // Build set of traversed edges.
      const traversedEdges = new Set<string>();
      for (let i = 0; i < run.path.length - 1; i++) {
        traversedEdges.add(`${run.path[i]}→${run.path[i + 1]}`);
      }

      setNodes((nds) =>
        nds.map((n) => {
          const step = orderMap.get(n.id);
          const nodeOutput = run.outputs[n.id];
          return {
            ...n,
            data: {
              ...n.data,
              highlighted: step != null,
              executionOrder: step,
              llmResponse: nodeOutput?.llmResponse,
            },
          };
        })
      );

      setEdges((eds) =>
        eds.map((e) => {
          const isTraversed = traversedEdges.has(`${e.source}→${e.target}`);
          return {
            ...e,
            animated: isTraversed,
            style: isTraversed
              ? { stroke: "#22c55e", strokeWidth: 2.5 }
              : {},
          };
        })
      );
    },
    [getCurrentFlow, setNodes, setEdges]
  );

  // ── Clear highlights ──
  const handleClearHighlights = useCallback(() => {
    setLastRun(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          highlighted: false,
          executionOrder: undefined,
          llmResponse: undefined,
        },
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: false,
        style: {},
      }))
    );
  }, [setNodes, setEdges]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S — Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Delete/Backspace — Delete selected node or edge (only when not in an input)
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (selectedNode) {
          e.preventDefault();
          handleDeleteNode(selectedNode.id);
        } else if (selectedEdge) {
          e.preventDefault();
          handleDeleteEdge(selectedEdge.id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, handleDeleteNode, handleDeleteEdge, selectedNode, selectedEdge]);

  // ── Minimap color ──
  const minimapNodeColor = useMemo(
    () => (node: Node) => {
      switch (node.type) {
        case "start":
          return "#64748b";
        case "end":
          return "#f87171";
        case "prompt":
          return "#3b82f6";
        case "router":
          return "#f59e0b";
        default:
          return "#94a3b8";
      }
    },
    []
  );

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
        {/* ── Left: Canvas ── */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <Toolbar
            flowName={flowName}
            onFlowNameChange={setFlowName}
            onAddNode={handleAddNode}
            onSave={handleSave}
            onOpenTest={() => setPanelMode("test")}
            saving={saving}
            nodeCount={nodes.length}
            edgeCount={edges.length}
            warnings={warnings}
          />
          <div style={{ flex: 1, position: "relative" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={null}
              defaultEdgeOptions={{
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
              <MiniMap nodeColor={minimapNodeColor} />
            </ReactFlow>
          </div>
        </div>

        {/* ── Right: Panels ── */}
        <div
          style={{ width: 380, borderLeft: "1px solid #e2e8f0", overflowY: "auto" }}
          className="bg-slate-50"
        >
          {/* Panel tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            {(["test", "node", "edge"] as const).map((tab) => {
              const disabled =
                (tab === "node" && !selectedNode) || (tab === "edge" && !selectedEdge);
              return (
                <button
                  key={tab}
                  onClick={() => !disabled && setPanelMode(tab)}
                  disabled={disabled}
                  className={`flex-1 text-xs font-medium py-2 ${
                    panelMode === tab
                      ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                      : disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {tab === "test" ? "Test" : tab === "node" ? "Node" : "Edge"}
                </button>
              );
            })}
          </div>

          {panelMode === "node" && selectedNode && (
            <NodeEditorPanel
              node={selectedNode}
              onDataChange={handleNodeDataChange}
              onDelete={handleDeleteNode}
              onClose={() => setPanelMode("test")}
            />
          )}
          {panelMode === "edge" && selectedEdge && (
            <EdgeEditorPanel
              edge={selectedEdge}
              onDataChange={handleEdgeDataChange}
              onDelete={handleDeleteEdge}
              onClose={() => setPanelMode("test")}
            />
          )}
          {panelMode === "test" && (
            <TestRunnerPanel
              onExecute={handleExecute}
              onClearHighlights={handleClearHighlights}
              lastRun={lastRun}
            />
          )}
        </div>
      </div>
      <ToastContainer />
    </ReactFlowProvider>
  );
}
