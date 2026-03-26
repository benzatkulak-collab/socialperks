"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface UseInViewOptions {
  /** IntersectionObserver threshold (0–1). Default: 0.15 */
  threshold?: number;
  /** Only fire once, then disconnect. Default: true */
  triggerOnce?: boolean;
  /** Root margin string, e.g. "0px 0px -50px 0px". Default: "0px" */
  rootMargin?: string;
}

interface UseInViewReturn {
  ref: React.RefCallback<HTMLElement>;
  inView: boolean;
}

/**
 * Lightweight IntersectionObserver hook.
 * Returns a callback ref and a boolean `inView`.
 * Respects `prefers-reduced-motion` — if the user prefers reduced motion,
 * `inView` is immediately `true` so content renders without waiting.
 */
export function useInView(options: UseInViewOptions = {}): UseInViewReturn {
  const { threshold = 0.15, triggerOnce = true, rootMargin = "0px" } = options;
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  // Respect prefers-reduced-motion: skip observation, show immediately
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      setInView(true);
    }
  }, [prefersReducedMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      nodeRef.current = node;

      // If reduced motion or no node, bail
      if (prefersReducedMotion || !node) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (triggerOnce) {
              observer.disconnect();
              observerRef.current = null;
            }
          } else if (!triggerOnce) {
            setInView(false);
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [threshold, triggerOnce, rootMargin, prefersReducedMotion]
  );

  return { ref, inView };
}
