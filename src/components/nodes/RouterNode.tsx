"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ExecutionBadge } from "./ExecutionBadge";

export interface RouterNodeData extends Record<string, unknown> {
  label: string;
  highlighted?: boolean;
  executionOrder?: number;
}

export function RouterNode({ data, selected }: NodeProps) {
  const { label, highlighted, executionOrder } = data as RouterNodeData;
  return (
    <div className="relative">
      {highlighted && executionOrder != null && <ExecutionBadge step={executionOrder} />}
      <div
        className={`border-2 px-4 py-3 min-w-[140px] text-sm text-center shadow-sm
          ${highlighted ? "border-green-500 bg-green-50" : selected ? "border-amber-500 bg-amber-50" : "border-amber-300 bg-amber-50"}`}
        style={{
          transform: "rotate(45deg)",
          width: 100,
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-amber-500" />
        <span style={{ transform: "rotate(-45deg)", display: "block" }} className="font-semibold text-amber-900">
          {label}
        </span>
        <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
      </div>
    </div>
  );
}
