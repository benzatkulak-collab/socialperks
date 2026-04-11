"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNotificationsSSE, type SSENotification } from "@/lib/hooks/use-notifications-sse";

// ─── Props ──────────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  token: string | null;
}

// ─── Notification icon by type ──────────────────────────────────────────────

function notificationIcon(type: string): string {
  switch (type) {
    case "submission.created":
      return "\uD83D\uDCE5"; // inbox tray
    case "submission.approved":
      return "\u2705"; // green check
    case "submission.rejected":
      return "\u274C"; // red X
    case "campaign.created":
      return "\uD83D\uDE80"; // rocket
    case "user.created":
      return "\uD83D\uDC4B"; // wave
    default:
      return "\uD83D\uDD14"; // bell
  }
}

// ─── Relative time formatting ───────────────────────────────────────────────

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const NotificationCenter = React.memo(function NotificationCenter({ token }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, connected } =
    useNotificationsSSE(token);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const handleNotificationClick = useCallback(
    (id: string) => {
      markAsRead(id);
    },
    [markAsRead]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={toggle}
        className="
          relative flex h-8 w-8 items-center justify-center rounded-lg
          text-brand-dim transition-all duration-fast ease-smooth
          hover:bg-brand-surface/60 hover:text-brand-text
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40
        "
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Bell SVG */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path
            d="M8 1.5C5.79 1.5 4 3.29 4 5.5V8L3 10H13L12 8V5.5C12 3.29 10.21 1.5 8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 10V10.5C6.5 11.33 7.17 12 8 12C8.83 12 9.5 11.33 9.5 10.5V10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="
              absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center
              rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white
              animate-fade-up
            "
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        {connected && (
          <span
            className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-brand-green"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="
            absolute right-0 top-full mt-2 z-50
            w-80 max-h-[420px] overflow-hidden
            rounded-xl border border-brand-border/50
            bg-brand-surface/95 backdrop-blur-xl
            shadow-xl shadow-black/20
            animate-fade-up
          "
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-border/50 px-4 py-3">
            <h2 className="text-sm font-semibold text-brand-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="
                  text-xs text-brand-cyan transition-colors duration-fast
                  hover:text-cyan-300
                  focus-visible:outline-none focus-visible:underline
                "
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[360px] overscroll-contain" aria-live="polite" aria-relevant="additions">
            {notifications.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-brand-border/30" role="list">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={handleNotificationClick}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <svg
        width="32"
        height="32"
        viewBox="0 0 16 16"
        fill="none"
        className="w-8 h-8 text-brand-muted mb-3"
        aria-hidden="true"
      >
        <path
          d="M8 1.5C5.79 1.5 4 3.29 4 5.5V8L3 10H13L12 8V5.5C12 3.29 10.21 1.5 8 1.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 10V10.5C6.5 11.33 7.17 12 8 12C8.83 12 9.5 11.33 9.5 10.5V10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-xs text-brand-muted">No notifications yet</p>
    </div>
  );
}

// ─── Individual notification item ───────────────────────────────────────────

const NotificationItem = React.memo(function NotificationItem({
  notification,
  onClick,
}: {
  notification: SSENotification;
  onClick: (id: string) => void;
}) {
  return (
    <li>
      <button
        onClick={() => onClick(notification.id)}
        className={`
          w-full flex items-start gap-3 px-4 py-3 text-left
          transition-colors duration-fast ease-smooth
          hover:bg-brand-elevated/50
          focus-visible:outline-none focus-visible:bg-brand-elevated/50
          ${!notification.read ? "bg-brand-cyan/[0.03]" : ""}
        `}
      >
        {/* Icon */}
        <span className="mt-0.5 text-sm flex-shrink-0" aria-hidden="true">
          {notificationIcon(notification.type)}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs leading-relaxed ${
              notification.read ? "text-brand-dim" : "text-brand-text"
            }`}
          >
            {notification.message}
          </p>
          <p className="text-[10px] text-brand-muted mt-0.5">
            {relativeTime(notification.timestamp)}
          </p>
        </div>

        {/* Unread dot */}
        {!notification.read && (
          <span
            className="mt-1.5 h-2 w-2 rounded-full bg-brand-cyan flex-shrink-0"
            aria-label="Unread"
          />
        )}
      </button>
    </li>
  );
});
