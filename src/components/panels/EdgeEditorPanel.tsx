"use client";

import { type Edge as RFEdge } from "@xyflow/react";

interface Props {
  edge: RFEdge;
  onDataChange: (edgeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function EdgeEditorPanel({ edge, onDataChange, onClose }: Props) {
  const data = (edge.data ?? {}) as Record<string, unknown>;

  const update = (field: string, value: string) => {
    onDataChange(edge.id, { [field]: value });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Edit Edge
        </h2>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="text-xs text-slate-500 font-mono">
        {edge.source} &rarr; {edge.target}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">
          Condition (DSL)
        </span>
        <input
          type="text"
          value={(data.condition as string) ?? ""}
          onChange={(e) => update("condition", e.target.value)}
          placeholder={'e.g. intent == "sales"'}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-mono
                     focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
        />
      </label>

      <p className="text-xs text-slate-400">
        Conditions are evaluated when the source is a router node.
        Supported operators: ==, !=, &gt;, &gt;=, &lt;, &lt;=
      </p>
    </div>
  );
}
