"use client";

import type { NodeType } from "@/types/flow";

interface Props {
  flowName: string;
  onFlowNameChange: (name: string) => void;
  onAddNode: (type: NodeType) => void;
  onSave: () => void;
  onOpenTest: () => void;
}

const NODE_BUTTONS: { type: NodeType; label: string; color: string }[] = [
  { type: "start", label: "+ Start", color: "bg-slate-200 hover:bg-slate-300 text-slate-700" },
  { type: "prompt", label: "+ Prompt", color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
  { type: "router", label: "+ Router", color: "bg-amber-100 hover:bg-amber-200 text-amber-700" },
  { type: "end", label: "+ End", color: "bg-red-100 hover:bg-red-200 text-red-700" },
];

export function Toolbar({ flowName, onFlowNameChange, onAddNode, onSave, onOpenTest }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 bg-white">
      {/* Flow name */}
      <input
        type="text"
        value={flowName}
        onChange={(e) => onFlowNameChange(e.target.value)}
        className="text-sm font-semibold text-slate-700 border-b border-transparent
                   hover:border-slate-300 focus:border-blue-400 outline-none px-1 py-0.5 w-48"
      />

      <div className="h-4 w-px bg-slate-200" />

      {/* Node buttons */}
      {NODE_BUTTONS.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={() => onAddNode(type)}
          className={`text-xs font-medium px-3 py-1.5 rounded ${color}`}
        >
          {label}
        </button>
      ))}

      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={onOpenTest}
        className="text-xs font-medium px-3 py-1.5 rounded border border-slate-300
                   text-slate-600 hover:bg-slate-100"
      >
        Test
      </button>
      <button
        onClick={onSave}
        className="text-xs font-medium px-3 py-1.5 rounded bg-green-600 text-white
                   hover:bg-green-700"
      >
        Save
      </button>
    </div>
  );
}
