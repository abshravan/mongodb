"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ExecutionBadge } from "./ExecutionBadge";

export interface EndNodeData extends Record<string, unknown> {
  label: string;
  highlighted?: boolean;
  executionOrder?: number;
}

export function EndNode({ data }: NodeProps) {
  const { label, highlighted, executionOrder } = data as EndNodeData;
  return (
    <div className="relative">
      {highlighted && executionOrder != null && <ExecutionBadge step={executionOrder} />}
      <div
        className={`rounded-full px-6 py-3 border-2 text-center text-sm font-semibold
          ${highlighted ? "border-green-500 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-700"}`}
      >
        <Handle type="target" position={Position.Top} className="!bg-red-400" />
        {label}
      </div>
    </div>
  );
}
