"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  borderColor?:
    | "cyan"
    | "green"
    | "amber"
    | "red"
    | "purple"
    | "pink"
    | "orange"
    | "muted"
    | (string & {});
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

const paddingClasses: Record<string, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className = "",
  onClick,
  hoverable = false,
  padding = "md",
  borderColor,
}: CardProps) {
  const isHex =
    typeof borderColor === "string" && borderColor.startsWith("#");
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
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      className={`
        bg-brand-surface border border-brand-border rounded-xl overflow-hidden
        shadow-xs
        ${paddingClasses[padding]}
        ${
          hoverable || onClick
            ? [
                "transition-all duration-normal ease-smooth",
                "hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-border-hover",
                "active:translate-y-0 active:shadow-sm",
              ].join(" ")
            : ""
        }
        ${borderClass}
        ${isClickable ? "cursor-pointer" : ""}
        ${onClick ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg" : ""}
        ${className}
      `}
      style={borderStyle}
    >
      {children}
    </div>
  );
}
