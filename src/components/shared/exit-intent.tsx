"use client";
import { useState, useEffect, useCallback, useRef } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function ExitIntent() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const shownRef = useRef(false);
  const mountedAtRef = useRef<number>(0);

  const trigger = useCallback(() => {
    if (shownRef.current) return;
    if (sessionStorage.getItem("sp-exit-intent-shown") === "1") return;
    const elapsed = Date.now() - mountedAtRef.current;
    if (elapsed < 30_000) return;
    shownRef.current = true;
    sessionStorage.setItem("sp-exit-intent-shown", "1");
    setOpen(true);
  }, []);

  useEffect(() => {
    mountedAtRef.current = Date.now();
    if (sessionStorage.getItem("sp-exit-intent-shown") === "1") {
      shownRef.current = true;
      return;
    }

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(max-width: 768px)").matches ||
        /Mobi|Android/i.test(navigator.userAgent));

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) {
        trigger();
      }
    };

    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.body.scrollHeight;
      if (total > 0 && scrolled / total > 0.85) {
        trigger();
      }
    };

    if (isMobile) {
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      document.addEventListener("mouseout", onMouseOut);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [trigger]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit-intent" }),
      });
      if (!res.ok) throw new Error("Subscription failed");
      setStatus("success");
      setTimeout(() => setOpen(false), 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-gray-900 border border-cyan-400/40 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-200 p-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✉️</div>
            <h2 className="font-heading italic text-2xl text-gray-100 mb-2">Check your inbox!</h2>
            <p className="text-gray-400 text-sm">Your free playbook is on its way.</p>
          </div>
        ) : (
          <>
            <h2 id="exit-intent-title" className="font-heading italic text-2xl md:text-3xl text-gray-100 mb-2">
              Wait — before you go!
            </h2>
            <p className="text-gray-300 mb-5">
              Get a free small business marketing playbook delivered to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                required
                className="w-full px-4 py-2.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition"
                disabled={status === "submitting"}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-cyan-400 text-black font-medium py-2.5 rounded-md hover:bg-cyan-300 transition disabled:opacity-60"
              >
                {status === "submitting" ? "Subscribing..." : "Subscribe"}
              </button>
              {status === "error" && errorMsg && (
                <p className="text-sm text-red-400">{errorMsg}</p>
              )}
            </form>
            <p className="text-xs text-gray-500 mt-4 text-center">
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
