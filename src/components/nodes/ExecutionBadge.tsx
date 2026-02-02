"use client";

interface Props {
  step: number;
}

export function ExecutionBadge({ step }: Props) {
  return (
    <div
      className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-green-600 text-white
                 text-xs font-bold flex items-center justify-center shadow"
    >
      {step}
    </div>
  );
}
