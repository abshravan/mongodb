"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ExecutionBadge } from "./ExecutionBadge";

export interface PromptNodeData extends Record<string, unknown> {
  label: string;
  promptTemplate?: string;
  outputKey?: string;
  highlighted?: boolean;
  executionOrder?: number;
  llmResponse?: string;
}

export function PromptNode({ data, selected }: NodeProps) {
  const { label, outputKey, highlighted, executionOrder, llmResponse } =
    data as PromptNodeData;

  const truncated =
    llmResponse && llmResponse.length > 80
      ? llmResponse.slice(0, 80) + "..."
      : llmResponse;

  return (
    <div className="relative">
      {highlighted && executionOrder != null && <ExecutionBadge step={executionOrder} />}
      <div
        className={`rounded-lg border-2 px-4 py-3 min-w-[160px] max-w-[260px] text-sm shadow-sm
          ${highlighted ? "border-green-500 bg-green-50" : selected ? "border-blue-500 bg-white" : "border-slate-300 bg-white"}`}
      >
        <Handle type="target" position={Position.Top} className="!bg-blue-400" />
        <div className="font-semibold text-slate-800">{label}</div>
        {outputKey && (
          <div className="mt-1 text-xs text-slate-500 font-mono">
            &rarr; {outputKey}
          </div>
        )}
        {highlighted && truncated && (
          <div className="mt-2 text-xs text-green-800 bg-green-100 rounded px-2 py-1 font-mono whitespace-pre-wrap break-words">
            {truncated}
          </div>
        )}
        <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
      </div>
    </div>
  );
}
