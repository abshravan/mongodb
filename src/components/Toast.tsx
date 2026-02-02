"use client";

import { useState, useEffect, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

let externalPush: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "info") {
  externalPush?.(message, type);
}

const COLORS: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-slate-700",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    externalPush = push;
    return () => {
      externalPush = null;
    };
  }, [push]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${COLORS[t.type]} text-white text-sm px-4 py-2 rounded shadow-lg`}
          style={{ minWidth: 220, animation: "fadeIn 0.2s ease" }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
