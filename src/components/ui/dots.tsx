"use client";

import React from "react";

interface DotsProps {
  count: number;
  max?: number;
}

export function Dots({ count, max = 5 }: DotsProps) {
  const safeCount = Math.max(0, Math.min(count ?? 0, max));
  const safeMax = Math.max(0, max);
  return (
    <div className="inline-flex items-center gap-1" aria-label={`${safeCount} out of ${safeMax}`}>
      {Array.from({ length: safeMax }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
            i < safeCount ? "bg-brand-cyan" : "bg-brand-border"
          }`}
        />
      ))}
    </div>
  );
}
