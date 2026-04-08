"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchResultItem {
  id: string;
  type: string;
  score: number;
  highlights: Record<string, string>;
  metadata?: Record<string, unknown>;
}

interface SearchBarProps {
  /** Called when a result is selected */
  onSelect?: (result: SearchResultItem) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

const TYPE_COLORS: Record<string, "cyan" | "green" | "orange" | "purple"> = {
  campaign: "cyan",
  business: "green",
  influencer: "purple",
  submission: "orange",
};

const TYPE_LABELS: Record<string, string> = {
  campaign: "Campaign",
  business: "Business",
  influencer: "Influencer",
  submission: "Submission",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SearchBar({
  onSelect,
  placeholder = "Search campaigns, businesses, influencers...",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch results ───────────────────────────────────────────────────────

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ q, limit: "10", fuzzy: "true" });
      const res = await fetch(`/api/v1/search?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setResults(json.data.results ?? []);
        }
      }
    } catch {
      // Silently handle network errors
    }

    // Fetch autocomplete suggestions in parallel
    // (We use the same search API — suggestions come from result types)
    setIsLoading(false);
    setIsOpen(true);
  }, []);

  // ── Debounced search ────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  // ── Click outside to close ──────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Keyboard navigation ─────────────────────────────────────────────────

  const totalItems = suggestions.length + results.length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" && query.length >= MIN_QUERY_LENGTH) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0) {
          if (activeIndex < suggestions.length) {
            // Selected a suggestion — fill and search
            setQuery(suggestions[activeIndex]);
            fetchResults(suggestions[activeIndex]);
          } else {
            // Selected a result
            const result = results[activeIndex - suggestions.length];
            if (result) {
              handleSelect(result);
            }
          }
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }

  function handleSelect(result: SearchResultItem) {
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect?.(result);
  }

  // ── Group results by type ───────────────────────────────────────────────

  const groupedResults = results.reduce<Record<string, SearchResultItem[]>>(
    (acc, result) => {
      const type = result.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(result);
      return acc;
    },
    {}
  );

  // ── Render ──────────────────────────────────────────────────────────────

  let itemIndex = suggestions.length - 1; // Track index for keyboard nav

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative group">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none transition-colors duration-fast group-focus-within:text-brand-cyan"
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
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.length >= MIN_QUERY_LENGTH && (results.length > 0 || suggestions.length > 0)) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="search-results-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
          }
          role="combobox"
          autoComplete="off"
          className="
            w-full pl-9 pr-9 py-2 text-sm min-h-[40px]
            bg-brand-elevated border border-brand-border rounded-lg
            font-body text-brand-text placeholder:text-brand-muted/60
            transition-all duration-fast ease-smooth
            hover:border-brand-border-hover
            focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/50
          "
        />
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-muted/30 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        )}
        {/* Clear button */}
        {!isLoading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              flex items-center justify-center w-5 h-5 rounded
              text-brand-muted
              transition-all duration-fast ease-smooth
              hover:text-brand-text hover:bg-brand-surface
            "
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

      {/* Dropdown */}
      {isOpen && (results.length > 0 || suggestions.length > 0) && (
        <div
          id="search-results-listbox"
          role="listbox"
          className="
            absolute top-full left-0 right-0 mt-1 z-dropdown
            bg-brand-elevated border border-brand-border rounded-lg
            shadow-lg overflow-hidden max-h-[400px] overflow-y-auto
          "
        >
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 border-b border-brand-border/50">
              <div className="text-3xs font-mono text-brand-muted uppercase tracking-wider mb-1">
                Suggestions
              </div>
              {suggestions.map((suggestion, i) => (
                <div
                  key={`suggestion-${suggestion}`}
                  id={`search-item-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  onClick={() => {
                    setQuery(suggestion);
                    fetchResults(suggestion);
                  }}
                  className={`
                    px-2 py-1.5 rounded text-sm cursor-pointer
                    transition-colors duration-fast
                    ${
                      activeIndex === i
                        ? "bg-brand-cyan/10 text-brand-cyan"
                        : "text-brand-text hover:bg-brand-surface"
                    }
                  `}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Results grouped by type */}
          {Object.entries(groupedResults).map(([type, items]) => (
            <div key={type} className="px-3 py-2 border-b border-brand-border/50 last:border-b-0">
              <div className="text-3xs font-mono text-brand-muted uppercase tracking-wider mb-1">
                {TYPE_LABELS[type] ?? type}s
              </div>
              {items.map((result) => {
                itemIndex++;
                const currentIndex = itemIndex;
                // Get the first highlighted field or fall back to first field
                const highlightEntries = Object.entries(result.highlights);
                const title =
                  highlightEntries.length > 0
                    ? highlightEntries[0][1]
                    : Object.values(result.highlights)[0] ?? result.id;
                const subtitle =
                  highlightEntries.length > 1 ? highlightEntries[1][1] : null;

                return (
                  <div
                    key={result.id}
                    id={`search-item-${currentIndex}`}
                    role="option"
                    aria-selected={activeIndex === currentIndex}
                    onClick={() => handleSelect(result)}
                    className={`
                      flex items-center gap-2 px-2 py-2 rounded cursor-pointer
                      transition-colors duration-fast
                      ${
                        activeIndex === currentIndex
                          ? "bg-brand-cyan/10"
                          : "hover:bg-brand-surface"
                      }
                    `}
                  >
                    <Badge
                      color={TYPE_COLORS[result.type] ?? "muted"}
                      size="sm"
                    >
                      {TYPE_LABELS[result.type] ?? result.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm text-brand-text truncate"
                        dangerouslySetInnerHTML={{ __html: title }}
                      />
                      {subtitle && (
                        <div
                          className="text-xs text-brand-muted truncate"
                          dangerouslySetInnerHTML={{ __html: subtitle }}
                        />
                      )}
                    </div>
                    <span className="text-3xs font-mono text-brand-muted shrink-0">
                      {result.score.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* No results */}
          {results.length === 0 && suggestions.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-brand-muted">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
