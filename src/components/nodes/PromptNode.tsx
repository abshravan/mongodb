"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface PromptNodeData extends Record<string, unknown> {
  label: string;
  promptTemplate?: string;
  outputKey?: string;
  highlighted?: boolean;
}

export function PromptNode({ data, selected }: NodeProps) {
  const { label, outputKey, highlighted } = data as PromptNodeData;
  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 min-w-[160px] text-sm shadow-sm
        ${highlighted ? "border-green-500 bg-green-50" : selected ? "border-blue-500 bg-white" : "border-slate-300 bg-white"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      <div className="font-semibold text-slate-800">{label}</div>
      {outputKey && (
        <div className="mt-1 text-xs text-slate-500 font-mono">
          &rarr; {outputKey}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  );
}
