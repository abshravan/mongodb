"use client";

import {
  ReactFlow,
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
import { useCallback, useMemo, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { StartNode } from "@/components/nodes/StartNode";
import { EndNode } from "@/components/nodes/EndNode";
import { PromptNode } from "@/components/nodes/PromptNode";
import { RouterNode } from "@/components/nodes/RouterNode";
import { NodeEditorPanel } from "@/components/panels/NodeEditorPanel";
import { EdgeEditorPanel } from "@/components/panels/EdgeEditorPanel";
import { TestRunnerPanel } from "@/components/panels/TestRunnerPanel";
import { Toolbar } from "@/components/toolbar/Toolbar";
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

  // ── Selection ──
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<RFEdge | null>(null);

  // ── Execution result ──
  const [lastRun, setLastRun] = useState<Run | null>(null);

  // ── Right panel mode ──
  const [panelMode, setPanelMode] = useState<"node" | "edge" | "test">("test");

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

  // ── Selection change ──
  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (selNodes.length === 1) {
        setSelectedNode(selNodes[0]);
        setSelectedEdge(null);
        setPanelMode("node");
      } else if (selEdges.length === 1) {
        setSelectedEdge(selEdges[0]);
        setSelectedNode(null);
        setPanelMode("edge");
      } else {
        setSelectedNode(null);
        setSelectedEdge(null);
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
    },
    [setNodes]
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
    const flow = getCurrentFlow();
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Save failed: ${err.error}\n${JSON.stringify(err.details ?? "")}`);
      return;
    }
    versionRef.current += 1;
  }, [getCurrentFlow]);

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
        alert(`Execution failed: ${json.error}\n${json.details ?? ""}`);
        return;
      }
      const run = json.run as Run;
      setLastRun(run);

      // Build execution order map: nodeId → 1-based step number.
      const orderMap = new Map<string, number>();
      run.path.forEach((id, i) => orderMap.set(id, i + 1));

      // Build set of traversed edges (consecutive pairs in path).
      const traversedEdges = new Set<string>();
      for (let i = 0; i < run.path.length - 1; i++) {
        traversedEdges.add(`${run.path[i]}→${run.path[i + 1]}`);
      }

      // Highlight nodes with execution order + LLM response preview.
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

      // Highlight edges on the executed path.
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
    <div className="flex h-screen w-screen">
      {/* ── Left: Canvas ── */}
      <div className="flex flex-col flex-1">
        <Toolbar
          flowName={flowName}
          onFlowNameChange={setFlowName}
          onAddNode={handleAddNode}
          onSave={handleSave}
          onOpenTest={() => setPanelMode("test")}
        />
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
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
      <div className="w-[380px] border-l border-slate-200 bg-slate-50 overflow-y-auto">
        {panelMode === "node" && selectedNode && (
          <NodeEditorPanel
            node={selectedNode}
            onDataChange={handleNodeDataChange}
            onClose={() => setPanelMode("test")}
          />
        )}
        {panelMode === "edge" && selectedEdge && (
          <EdgeEditorPanel
            edge={selectedEdge}
            onDataChange={handleEdgeDataChange}
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
  );
}
