"use client";

import React from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-xl text-brand-white font-semibold italic truncate">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-brand-muted mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function AdminPageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
