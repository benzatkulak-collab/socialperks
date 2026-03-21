"use client";

import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <span className="text-4xl mb-4 block">{icon}</span>
      )}
      <h4 className="font-heading italic text-lg text-brand-white mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-sm text-brand-muted max-w-xs mb-5">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium font-body rounded-lg bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90 transition-colors duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
