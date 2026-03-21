"use client";

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: { text: "text-lg", dot: "w-1.5 h-1.5" },
  md: { text: "text-2xl", dot: "w-2 h-2" },
  lg: { text: "text-4xl", dot: "w-2.5 h-2.5" },
  xl: { text: "text-5xl", dot: "w-3 h-3" },
};

export function Logo({ size = "md" }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`font-heading italic text-brand-white ${s.text}`}>
        Social
      </span>
      <span className={`${s.dot} rounded-full bg-brand-cyan`} />
      <span className={`font-heading italic text-brand-cyan ${s.text}`}>
        Perks
      </span>
    </div>
  );
}
