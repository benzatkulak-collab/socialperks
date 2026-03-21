"use client";

import React from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-1 bg-brand-elevated rounded-lg p-1" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`
              px-3.5 py-1.5 rounded-md text-sm font-body font-medium transition-all duration-200
              ${
                isActive
                  ? "bg-brand-surface text-brand-white shadow-sm"
                  : "text-brand-muted hover:text-brand-dim"
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 text-2xs font-mono ${
                  isActive ? "text-brand-cyan" : "text-brand-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
