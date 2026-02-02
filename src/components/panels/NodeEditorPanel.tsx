"use client";

import { type Node } from "@xyflow/react";

interface Props {
  node: Node;
  onDataChange: (nodeId: string, data: Record<string, unknown>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeEditorPanel({ node, onDataChange, onDelete, onClose }: Props) {
  const data = node.data as Record<string, unknown>;
  const nodeType = node.type as string;

  const update = (field: string, value: string) => {
    onDataChange(node.id, { [field]: value });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Edit Node
        </h2>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="text-xs text-slate-500 font-mono">
        {node.id} ({nodeType})
      </div>

      {/* Label */}
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Label</span>
        <input
          type="text"
          value={(data.label as string) ?? ""}
          onChange={(e) => update("label", e.target.value)}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm
                     focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
        />
      </label>

      {/* Prompt-specific fields */}
      {nodeType === "prompt" && (
        <>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              Prompt Template
            </span>
            <textarea
              value={(data.promptTemplate as string) ?? ""}
              onChange={(e) => update("promptTemplate", e.target.value)}
              rows={6}
              placeholder={'e.g. Classify intent for: {{userMessage}}'}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-mono
                         focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              Output Key
            </span>
            <input
              type="text"
              value={(data.outputKey as string) ?? ""}
              onChange={(e) => update("outputKey", e.target.value)}
              placeholder="e.g. intent"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-mono
                         focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
            />
          </label>
        </>
      )}

      {/* Delete button */}
      <div className="pt-2 border-t border-slate-200">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full text-xs font-medium px-3 py-2 rounded bg-red-50 text-red-600
                     hover:bg-red-100 border border-red-200"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
