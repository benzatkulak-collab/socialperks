"use client";

import React, { useEffect, useCallback, useRef } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** @deprecated Use `size` instead. Kept for backward compatibility. */
  maxWidth?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]",
};

// Selector for all focusable elements within a container
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  maxWidth,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const descriptionId = title
    ? `modal-desc-${title.replace(/\s+/g, "-").toLowerCase()}`
    : undefined;

  // Resolve size class: prefer `size` prop, fall back to legacy `maxWidth`
  const resolvedMaxWidth = maxWidth || sizeClasses[size];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trapping: trap Tab / Shift+Tab within the modal
      if (e.key === "Tab" && panelRef.current) {
        const focusableElements =
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    // Capture the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    // Focus the panel on open for screen readers
    requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Restore focus to the element that triggered the modal
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Dialog"}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`
          relative w-full ${resolvedMaxWidth}
          bg-brand-surface border border-brand-border rounded-2xl
          shadow-2xl animate-modal-in
          overflow-hidden focus:outline-none
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
            <h3 className="font-heading italic text-xl text-brand-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="
                flex items-center justify-center w-8 h-8 rounded-lg
                text-brand-muted
                transition-all duration-fast ease-smooth
                hover:text-brand-text hover:bg-brand-elevated
                active:scale-95
                focus-visible:ring-2 focus-visible:ring-brand-cyan/40
              "
              aria-label="Close dialog"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1L13 13M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div
          id={descriptionId}
          className="px-6 py-5 max-h-[70vh] overflow-y-auto scrollbar-thin"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
