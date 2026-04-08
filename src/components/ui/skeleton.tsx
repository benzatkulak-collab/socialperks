"use client";

import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const roundedClasses: Record<string, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({
  width = "w-full",
  height = "h-4",
  rounded = "md",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`
        ${width} ${height} ${roundedClasses[rounded]}
        bg-brand-elevated animate-shimmer
        bg-[length:200%_100%]
        bg-gradient-to-r from-brand-elevated via-brand-border/50 to-brand-elevated
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/* Preset skeleton patterns */

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`} role="status" aria-label="Loading text">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height="h-3.5"
          width={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-brand-surface border border-brand-border rounded-xl p-6 ${className}`}
      role="status"
      aria-label="Loading card"
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width="w-10" height="h-10" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height="h-4" width="w-1/3" />
          <Skeleton height="h-3" width="w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
