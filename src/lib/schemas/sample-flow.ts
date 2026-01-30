/**
 * Sample flow definition for testing and validation.
 *
 * This flow implements a simple intent-classification pipeline:
 *
 *   START → Classify Intent → Route by Intent
 *          ├── intent == "sales"    → Sales Response → END
 *          └── intent == "support"  → Support Response → END
 */

import type { Flow } from "@/types/flow";

export const sampleFlow: Flow = {
  id: "flow-001",
  name: "Intent Router Demo",
  version: 1,
  nodes: [
    {
      id: "start",
      type: "start",
      label: "Start",
      position: { x: 250, y: 0 },
    },
    {
      id: "classify",
      type: "prompt",
      label: "Classify Intent",
      position: { x: 250, y: 120 },
      promptTemplate:
        'Classify the following user message into exactly one intent: "sales" or "support". Respond with only the intent word, no explanation.\n\nMessage: {{userMessage}}',
      outputKey: "intent",
    },
    {
      id: "router",
      type: "router",
      label: "Route by Intent",
      position: { x: 250, y: 260 },
    },
    {
      id: "sales-response",
      type: "prompt",
      label: "Sales Response",
      position: { x: 80, y: 400 },
      promptTemplate:
        "You are a helpful sales assistant. The user said: {{userMessage}}. Provide a helpful sales-oriented response.",
      outputKey: "salesReply",
    },
    {
      id: "support-response",
      type: "prompt",
      label: "Support Response",
      position: { x: 420, y: 400 },
      promptTemplate:
        "You are a helpful support agent. The user said: {{userMessage}}. Provide a helpful support-oriented response.",
      outputKey: "supportReply",
    },
    {
      id: "end-sales",
      type: "end",
      label: "End (Sales)",
      position: { x: 80, y: 540 },
    },
    {
      id: "end-support",
      type: "end",
      label: "End (Support)",
      position: { x: 420, y: 540 },
    },
  ],
  edges: [
    {
      id: "e-start-classify",
      source: "start",
      target: "classify",
    },
    {
      id: "e-classify-router",
      source: "classify",
      target: "router",
    },
    {
      id: "e-router-sales",
      source: "router",
      target: "sales-response",
      condition: 'intent == "sales"',
      label: 'intent == "sales"',
    },
    {
      id: "e-router-support",
      source: "router",
      target: "support-response",
      condition: 'intent == "support"',
      label: 'intent == "support"',
    },
    {
      id: "e-sales-end",
      source: "sales-response",
      target: "end-sales",
    },
    {
      id: "e-support-end",
      source: "support-response",
      target: "end-support",
    },
  ],
};
