"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface StartNodeData extends Record<string, unknown> {
  label: string;
  highlighted?: boolean;
}

export function StartNode({ data }: NodeProps) {
  const { label, highlighted } = data as StartNodeData;
  return (
    <div
      className={`rounded-full px-6 py-3 border-2 text-center text-sm font-semibold
        ${highlighted ? "border-green-500 bg-green-50 text-green-800" : "border-slate-400 bg-slate-100 text-slate-700"}`}
    >
      {label}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
}
