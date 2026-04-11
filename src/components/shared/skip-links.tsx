'use client';

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-0 focus-within:left-0 focus-within:z-[9999] focus-within:bg-gray-900 focus-within:p-4">
      <a href="#main-content" className="text-cyan-400 underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-2 py-1">
        Skip to main content
      </a>
    </div>
  );
}
