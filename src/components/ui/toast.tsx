'use client';
import React, { useEffect, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const TOAST_COLORS = {
  success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  error: 'border-red-400/40 bg-red-400/10 text-red-300',
  warning: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  info: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
};

const TOAST_ICONS = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139',
};

const ToastItem = React.memo(function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), duration);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, [toast, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 ${
        TOAST_COLORS[toast.type]
      } ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
    >
      <span className="text-lg flex-shrink-0">{TOAST_ICONS[toast.type]}</span>
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        {'\u2715'}
      </button>
    </div>
  );
});

// Global toast state
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let currentToasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(l => l([...currentToasts]));
}

export function showToast(type: Toast['type'], message: string, duration?: number) {
  const toast: Toast = { id: crypto.randomUUID(), type, message, duration };
  currentToasts = [...currentToasts.slice(-4), toast]; // Max 5 toasts
  notifyListeners();
}

export function dismissToast(id: string) {
  currentToasts = currentToasts.filter(t => t.id !== id);
  notifyListeners();
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => { toastListeners = toastListeners.filter(l => l !== setToasts); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80" aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
