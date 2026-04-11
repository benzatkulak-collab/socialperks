"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "pills" | "underline";
  size?: "sm" | "md";
  className?: string;
  /** ID prefix for linking tab panels via aria-labelledby */
  id?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "pills",
  size = "md",
  className = "",
  id: tabsId,
}: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector<HTMLButtonElement>(
      '[aria-selected="true"]'
    );
    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicator({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, []);

  useEffect(() => {
    updateIndicator();
  }, [activeTab, updateIndicator]);

  // Recalculate on resize
  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // Arrow key navigation between tabs
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      if (currentIndex === -1) return;

      let nextIndex = -1;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      }

      if (nextIndex >= 0) {
        onChange(tabs[nextIndex].id);
        // Focus the newly activated tab button
        const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        buttons?.[nextIndex]?.focus();
      }
    },
    [tabs, activeTab, onChange]
  );

  const getTabId = (tabId: string) => tabsId ? `${tabsId}-tab-${tabId}` : undefined;
  const getPanelId = (tabId: string) => tabsId ? `${tabsId}-panel-${tabId}` : undefined;

  const sizeClasses =
    size === "sm"
      ? "px-3 py-2 min-h-[36px] text-xs"
      : "px-4 py-2.5 min-h-[44px] text-sm";

  if (variant === "underline") {
    return (
      <div
        ref={containerRef}
        className={`relative flex items-center gap-0 border-b border-brand-border ${className}`}
        role="tablist"
        aria-label="Tabs"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={getTabId(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={getPanelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`
                relative ${sizeClasses} font-body font-medium
                transition-colors duration-fast ease-smooth
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 rounded-sm
                ${
                  isActive
                    ? "text-brand-white"
                    : "text-brand-muted hover:text-brand-dim"
                }
              `}
            >
              <span className="inline-flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`font-mono text-2xs ${
                      isActive ? "text-brand-cyan" : "text-brand-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {/* Animated underline indicator */}
        <div
          className="absolute bottom-0 h-0.5 bg-brand-cyan rounded-full transition-all duration-normal ease-smooth"
          style={{
            left: indicator.left,
            width: indicator.width,
          }}
        />
      </div>
    );
  }

  // Default: pills variant
  return (
    <div
      ref={containerRef}
      className={`relative flex items-center gap-1 bg-brand-elevated rounded-xl p-1 ${className}`}
      role="tablist"
      aria-label="Tabs"
      onKeyDown={handleKeyDown}
    >
      {/* Animated pill background */}
      <div
        className="absolute top-1 h-[calc(100%-8px)] bg-brand-surface rounded-lg shadow-sm transition-all duration-normal ease-smooth pointer-events-none"
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={getTabId(tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-controls={getPanelId(tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`
              relative z-raised ${sizeClasses} rounded-lg font-body font-medium
              transition-colors duration-fast ease-smooth
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40
              ${
                isActive
                  ? "text-brand-white"
                  : "text-brand-muted hover:text-brand-dim"
              }
            `}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`font-mono text-2xs transition-colors duration-fast ${
                    isActive ? "text-brand-cyan" : "text-brand-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Wrapper for tab panel content. Use alongside Tabs for proper ARIA relationships. */
export function TabPanel({
  tabId,
  tabsId,
  active,
  children,
  className = "",
}: {
  tabId: string;
  tabsId: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div
      id={`${tabsId}-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`${tabsId}-tab-${tabId}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
