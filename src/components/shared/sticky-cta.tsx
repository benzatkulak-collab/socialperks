"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function StickyCta() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // Hide on dashboard/admin
  const hide = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin");

  useEffect(() => {
    if (sessionStorage.getItem("sp-sticky-cta-dismissed") === "1") {
      setDismissed(true);
      return;
    }
    const onScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setVisible(scrolled > 0.3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || hide || !visible) return null;

  const dismiss = () => {
    sessionStorage.setItem("sp-sticky-cta-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 md:p-4 pointer-events-none animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-3xl pointer-events-auto rounded-lg bg-gray-900/95 backdrop-blur border border-gray-800 shadow-xl p-4 flex items-center justify-between gap-4">
        <p className="text-sm md:text-base text-gray-100">
          <span className="font-medium">Start your 14-day free trial</span>
          <span className="hidden md:inline text-gray-400"> — no credit card</span>
        </p>
        <div className="flex items-center gap-2">
          <Link href="/auth" className="bg-cyan-400 text-black font-medium text-sm px-4 py-2 rounded-md hover:bg-cyan-300 transition">
            Get started →
          </Link>
          <button onClick={dismiss} aria-label="Dismiss" className="text-gray-500 hover:text-gray-300 p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
