"use client";

import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  width = "w-full",
  height = "h-4",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`${width} ${height} rounded-md bg-brand-elevated animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-brand-elevated via-brand-border to-brand-elevated ${className}`}
    />
  );
}
