"use client";

import React from "react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: "sm" | "md";
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  size = "md",
}: EmptyStateProps) {
  const isCompact = size === "sm";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        isCompact ? "py-10 px-4" : "py-16 px-6"
      }`}
    >
      {icon && (
        <span
          className={`block mb-4 ${isCompact ? "text-3xl" : "text-4xl"}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h4
        className={`font-heading italic text-brand-white mb-1 ${
          isCompact ? "text-base" : "text-lg"
        }`}
      >
        {title}
      </h4>
      {description && (
        <p
          className={`text-brand-muted max-w-xs mb-5 ${
            isCompact ? "text-xs" : "text-sm"
          }`}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size={isCompact ? "sm" : "md"}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
