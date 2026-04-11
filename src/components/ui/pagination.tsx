'use client';

/**
 * Pagination — Reusable pagination component
 *
 * Matches the Social Perks dark theme with cyan accents.
 * Supports page numbers with ellipsis, per-page selector, and showing range info.
 */

import { useCallback } from 'react';

interface PaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Items per page */
  perPage: number;
  /** Total number of items */
  total: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when per-page changes (shows selector when provided) */
  onPerPageChange?: (perPage: number) => void;
  /** Options for per-page selector */
  perPageOptions?: number[];
  /** Additional CSS classes */
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  className = '',
}: PaginationProps) {
  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = useCallback((): (number | '...')[] => {
    const pages: (number | '...')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push('...');
      }

      // Show pages around current
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [page, totalPages]);

  // Don't render if only one page
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const buttonBase =
    'px-2.5 py-1.5 text-sm rounded border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0C0F1A]';
  const buttonInactive =
    'border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5';
  const buttonActive =
    'border-cyan-400/40 bg-cyan-400/10 text-cyan-300 font-medium';
  const buttonDisabled =
    'opacity-30 cursor-not-allowed pointer-events-none';

  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Range indicator */}
      <p className="text-sm text-white/50 whitespace-nowrap">
        Showing{' '}
        <span className="text-white/80 font-mono text-xs">
          {start}&ndash;{end}
        </span>{' '}
        of{' '}
        <span className="text-white/80 font-mono text-xs">{total}</span>
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${buttonBase} ${page <= 1 ? buttonDisabled : buttonInactive}`}
          aria-label="Previous page"
        >
          Prev
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-white/30 select-none"
              aria-hidden="true"
            >
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${buttonBase} ${p === page ? buttonActive : buttonInactive}`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${buttonBase} ${page >= totalPages ? buttonDisabled : buttonInactive}`}
          aria-label="Next page"
        >
          Next
        </button>
      </div>

      {/* Per-page selector */}
      {onPerPageChange && (
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white/70 focus:border-cyan-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 cursor-pointer"
          aria-label="Items per page"
        >
          {perPageOptions.map((opt) => (
            <option key={opt} value={opt} className="bg-[#0C0F1A] text-white">
              {opt} / page
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
