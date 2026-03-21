"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  borderColor?: "cyan" | "green" | "amber" | "red" | "purple" | "pink" | "orange" | "muted" | (string & {});
}

const borderColorMap: Record<string, string> = {
  cyan: "border-l-2 border-l-brand-cyan",
  green: "border-l-2 border-l-brand-green",
  amber: "border-l-2 border-l-brand-amber",
  red: "border-l-2 border-l-brand-red",
  purple: "border-l-2 border-l-brand-purple",
  pink: "border-l-2 border-l-brand-pink",
  orange: "border-l-2 border-l-brand-orange",
  muted: "border-l-2 border-l-brand-muted",
};

export function Card({
  children,
  className = "",
  onClick,
  hoverable = false,
  borderColor,
}: CardProps) {
  const isHex = typeof borderColor === "string" && borderColor.startsWith("#");
  const borderClass = borderColor
    ? isHex
      ? "border-l-2"
      : borderColorMap[borderColor] ?? ""
    : "";
  const borderStyle = isHex ? { borderLeftColor: borderColor } : undefined;
  const isClickable = !!onClick || hoverable;

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      className={`
        bg-brand-surface border border-brand-border rounded-xl p-5
        ${hoverable ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-cyan/20 hover:shadow-lg cursor-pointer" : ""}
        ${borderClass}
        ${isClickable && !hoverable ? "cursor-pointer" : ""}
        ${onClick ? "focus:outline-none focus:ring-2 focus:ring-brand-cyan/40" : ""}
        ${className}
      `}
      style={borderStyle}
    >
      {children}
    </div>
  );
}
