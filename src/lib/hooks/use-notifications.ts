"use client";
import { useState, useCallback, useRef, useEffect } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification { id: string; type: NotificationType; title: string; message?: string; }

export function useNotifications(autoDismissMs = 5000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const add = useCallback((type: NotificationType, title: string, message?: string) => {
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 9);
    setNotifications(prev => [...prev, { id, type, title, message }]);
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        timersRef.current.delete(id);
      }, autoDismissMs);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [autoDismissMs]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  return { notifications, add, dismiss, clear };
}
