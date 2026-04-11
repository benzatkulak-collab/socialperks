"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  color?:
    | "cyan"
    | "green"
    | "amber"
    | "red"
    | "purple"
    | "pink"
    | "orange"
    | "muted"
    | (string & {});
  variant?: "default" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const colorMap = {
  cyan: {
    default: "text-brand-cyan bg-brand-cyan/10",
    outline: "text-brand-cyan border border-brand-cyan/30 bg-transparent",
    dot: "bg-brand-cyan",
  },
  green: {
    default: "text-brand-green bg-brand-green/10",
    outline: "text-brand-green border border-brand-green/30 bg-transparent",
    dot: "bg-brand-green",
  },
  amber: {
    default: "text-brand-amber bg-brand-amber/10",
    outline: "text-brand-amber border border-brand-amber/30 bg-transparent",
    dot: "bg-brand-amber",
  },
  red: {
    default: "text-brand-red bg-brand-red/10",
    outline: "text-brand-red border border-brand-red/30 bg-transparent",
    dot: "bg-brand-red",
  },
  purple: {
    default: "text-brand-purple bg-brand-purple/10",
    outline: "text-brand-purple border border-brand-purple/30 bg-transparent",
    dot: "bg-brand-purple",
  },
  pink: {
    default: "text-brand-pink bg-brand-pink/10",
    outline: "text-brand-pink border border-brand-pink/30 bg-transparent",
    dot: "bg-brand-pink",
  },
  orange: {
    default: "text-brand-orange bg-brand-orange/10",
    outline: "text-brand-orange border border-brand-orange/30 bg-transparent",
    dot: "bg-brand-orange",
  },
  muted: {
    default: "text-brand-muted bg-brand-muted/10",
    outline: "text-brand-muted border border-brand-muted/30 bg-transparent",
    dot: "bg-brand-muted",
  },
};

const sizeClasses = {
  sm: "px-1.5 py-px text-3xs gap-1",
  md: "px-2 py-0.5 text-3xs gap-1.5",
};

export const Badge = React.memo(function Badge({
  children,
  color = "cyan",
  variant = "default",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) {
  const isHex = typeof color === "string" && color.startsWith("#");
  const classes = isHex
    ? ""
    : colorMap[color as keyof typeof colorMap]?.[variant] ?? "";
  const dotColor = isHex
    ? ""
    : colorMap[color as keyof typeof colorMap]?.dot ?? "";
  const inlineStyle = isHex
    ? variant === "outline"
      ? {
          color,
          borderColor: color + "4D",
          backgroundColor: "transparent",
        }
      : { color, backgroundColor: color + "14" }
    : undefined;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold tracking-wider uppercase font-mono whitespace-nowrap
        ${sizeClasses[size]}
        ${isHex && variant === "outline" ? "border" : ""}
        ${classes}
        ${className}
      `}
      style={inlineStyle}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
          style={isHex ? { backgroundColor: color } : undefined}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
});
