"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  color?: "cyan" | "green" | "amber" | "red" | "purple" | "pink" | "orange" | "muted" | (string & {});
  variant?: "default" | "outline";
  className?: string;
}

const colorMap = {
  cyan: {
    default: "text-brand-cyan bg-brand-cyan/10",
    outline: "text-brand-cyan border border-brand-cyan/30 bg-transparent",
  },
  green: {
    default: "text-brand-green bg-brand-green/10",
    outline: "text-brand-green border border-brand-green/30 bg-transparent",
  },
  amber: {
    default: "text-brand-amber bg-brand-amber/10",
    outline: "text-brand-amber border border-brand-amber/30 bg-transparent",
  },
  red: {
    default: "text-brand-red bg-brand-red/10",
    outline: "text-brand-red border border-brand-red/30 bg-transparent",
  },
  purple: {
    default: "text-brand-purple bg-brand-purple/10",
    outline: "text-brand-purple border border-brand-purple/30 bg-transparent",
  },
  pink: {
    default: "text-brand-pink bg-brand-pink/10",
    outline: "text-brand-pink border border-brand-pink/30 bg-transparent",
  },
  orange: {
    default: "text-brand-orange bg-brand-orange/10",
    outline: "text-brand-orange border border-brand-orange/30 bg-transparent",
  },
  muted: {
    default: "text-brand-muted bg-brand-muted/10",
    outline: "text-brand-muted border border-brand-muted/30 bg-transparent",
  },
};

export function Badge({
  children,
  color = "cyan",
  variant = "default",
  className = "",
}: BadgeProps) {
  const isHex = typeof color === "string" && color.startsWith("#");
  const classes = isHex ? "" : colorMap[color as keyof typeof colorMap]?.[variant] ?? "";
  const inlineStyle = isHex
    ? variant === "outline"
      ? { color, borderColor: color + "4D", backgroundColor: "transparent" }
      : { color, backgroundColor: color + "14" }
    : undefined;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold tracking-wider uppercase font-mono whitespace-nowrap ${isHex && variant === "outline" ? "border" : ""} ${classes} ${className}`}
      style={inlineStyle}
    >
      {children}
    </span>
  );
}
