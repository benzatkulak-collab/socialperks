"use client";

import React from "react";
import { useInView } from "@/lib/hooks/use-in-view";

type Animation =
  | "fade-up"
  | "fade-in"
  | "fade-down"
  | "fade-in-scale"
  | "scale-in"
  | "slide-left"
  | "slide-right"
  | "slide-down"
  | "slide-up";

const ANIMATION_CLASS: Record<Animation, string> = {
  "fade-up": "animate-fade-up",
  "fade-in": "animate-fade-in",
  "fade-down": "animate-fade-down",
  "fade-in-scale": "animate-fade-in-scale",
  "scale-in": "animate-scale-in",
  "slide-left": "animate-slide-in-left",
  "slide-right": "animate-slide-in-right",
  "slide-down": "animate-slide-down",
  "slide-up": "animate-slide-up",
};

interface AnimateOnScrollProps {
  /** Which animation to apply. Default: "fade-up" */
  animation?: Animation;
  /** Delay in ms before animation starts (applied via animationDelay). */
  delay?: number;
  /** Custom animation duration in ms (applied via animationDuration). */
  duration?: number;
  /** Extra classes on the wrapper div. */
  className?: string;
  /** IntersectionObserver threshold (0–1). */
  threshold?: number;
  /** Root margin for early/late trigger. */
  rootMargin?: string;
  /** Whether to stagger children using animate-stagger-children. */
  stagger?: boolean;
  /** Custom stagger delay in ms (sets --stagger-delay CSS var). */
  staggerDelay?: number;
  children: React.ReactNode;
}

/**
 * Wrapper that applies a CSS animation class when the element scrolls into view.
 * Before entering the viewport, content is invisible (opacity: 0).
 * Respects prefers-reduced-motion via the useInView hook.
 */
export function AnimateOnScroll({
  animation = "fade-up",
  delay,
  duration,
  className = "",
  threshold,
  rootMargin,
  stagger = false,
  staggerDelay,
  children,
}: AnimateOnScrollProps) {
  const { ref, inView } = useInView({
    threshold: threshold ?? 0.15,
    rootMargin: rootMargin ?? "0px 0px -40px 0px",
    triggerOnce: true,
  });

  const animClass = inView ? ANIMATION_CLASS[animation] : "";
  const staggerClass = stagger && inView ? "animate-stagger-children" : "";

  const style: React.CSSProperties = {};
  if (delay) style.animationDelay = `${delay}ms`;
  if (duration) style.animationDuration = `${duration}ms`;
  // Set CSS variable for stagger delay (consumed by .animate-stagger-children)
  if (staggerDelay) {
    (style as Record<string, string>)["--stagger-delay"] = `${staggerDelay}ms`;
  }

  return (
    <div
      ref={ref}
      className={`${!inView ? "opacity-0" : ""} ${animClass} ${staggerClass} ${className}`.trim()}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {children}
    </div>
  );
}
