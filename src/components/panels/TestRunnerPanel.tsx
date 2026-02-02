"use client";

import { useState, useCallback } from "react";
import type { Run } from "@/types/flow";

interface Props {
  onExecute: (input: Record<string, unknown>) => Promise<void>;
  onClearHighlights: () => void;
  lastRun: Run | null;
}

export function TestRunnerPanel({ onExecute, onClearHighlights, lastRun }: Props) {
  const [inputJson, setInputJson] = useState('{\n  "userMessage": "I want to buy a plan"\n}');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(inputJson);
    } catch {
      setError("Invalid JSON input.");
      return;
    }
    setRunning(true);
    try {
      await onExecute(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Execution failed.");
    } finally {
      setRunning(false);
    }
  }, [inputJson, onExecute]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Test Runner
      </h2>

      {/* Input */}
      <label className="block">
        <span className="text-xs font-medium text-slate-600">
          Input JSON
        </span>
        <textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          rows={5}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-mono
                     focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y"
        />
      </label>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleRun}
          disabled={running}
          className="flex-1 rounded bg-blue-600 text-white text-sm font-medium px-4 py-2
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? "Running..." : "Execute Flow"}
        </button>
        <button
          onClick={onClearHighlights}
          className="rounded border border-slate-300 text-slate-600 text-sm px-3 py-2
                     hover:bg-slate-100"
        >
          Clear
        </button>
      </div>

      {/* Results */}
      {lastRun && (
        <div className="space-y-3 mt-2">
          <div className="text-xs text-slate-500">
            Run {lastRun.id.slice(0, 8)} &mdash; {lastRun.createdAt}
          </div>

          {/* Execution path */}
          <div>
            <h3 className="text-xs font-semibold text-slate-600 mb-1">
              Execution Path
            </h3>
            <div className="flex flex-wrap gap-1">
              {lastRun.path.map((nodeId, i) => (
                <span key={i}>
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-mono px-2 py-0.5 rounded">
                    {nodeId}
                  </span>
                  {i < lastRun.path.length - 1 && (
                    <span className="text-slate-400 mx-1">&rarr;</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Node outputs */}
          <div>
            <h3 className="text-xs font-semibold text-slate-600 mb-1">
              Node Outputs
            </h3>
            <div className="space-y-2">
              {Object.values(lastRun.outputs).map((output) => (
                <div
                  key={output.nodeId}
                  className="border border-slate-200 rounded p-2 bg-white"
                >
                  <div className="text-xs font-semibold text-slate-700">
                    {output.nodeLabel}
                    {output.outputKey && (
                      <span className="ml-2 text-slate-400 font-mono">
                        ({output.outputKey})
                      </span>
                    )}
                  </div>
                  {output.promptText && (
                    <details className="mt-1">
                      <summary className="text-xs text-slate-500 cursor-pointer">
                        Prompt
                      </summary>
                      <pre className="mt-1 text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded">
                        {output.promptText}
                      </pre>
                    </details>
                  )}
                  {output.llmResponse && (
                    <div className="mt-1 text-xs text-slate-800 bg-blue-50 p-2 rounded font-mono whitespace-pre-wrap">
                      {output.llmResponse}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
