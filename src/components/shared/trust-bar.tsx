export function TrustBar() {
  return (
    <div className="border-y border-gray-800 bg-gray-900/50 py-4">
      <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">★★★★★</span>
          <span>4.8/5 from 247 small business owners</span>
        </div>
        <div className="hidden md:block h-4 w-px bg-gray-700" />
        <div className="flex items-center gap-4">
          <span>Featured in:</span>
          <span className="font-medium text-gray-300">Product Hunt</span>
          <span className="font-medium text-gray-300">BetaList</span>
          <span className="font-medium text-gray-300">Indie Hackers</span>
        </div>
      </div>
    </div>
  );
}
