"use client";

import React, { useRef } from "react";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function Search({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  size = "md",
}: SearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses =
    size === "sm"
      ? "pl-8 pr-8 py-1.5 text-xs min-h-[32px]"
      : "pl-9 pr-9 py-2 text-sm min-h-[40px]";

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className={`relative group ${className}`}>
      <svg
        className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconSize} text-brand-muted pointer-events-none transition-colors duration-fast group-focus-within:text-brand-cyan`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`
          w-full bg-brand-elevated border border-brand-border rounded-lg
          font-body text-brand-text placeholder:text-brand-muted/60
          transition-all duration-fast ease-smooth
          hover:border-brand-border-hover
          focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/50
          ${sizeClasses}
        `}
      />
      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            flex items-center justify-center w-5 h-5 rounded
            text-brand-muted
            transition-all duration-fast ease-smooth
            hover:text-brand-text hover:bg-brand-surface
          `}
          aria-label="Clear search"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
