"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { API_ENDPOINTS } from "@/lib/shared/constants";

interface User { id: string; email: string; name: string; role: string; }

const SESSION_RESTORE_TIMEOUT = 5000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Session restore — validate existing session cookie on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT);
    async function restoreSession() {
      try {
        const res = await fetch(API_ENDPOINTS.auth, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data?.user) {
          setUser(json.data.user);
        }
      } catch {
        // Timeout or network error — fall through to landing page
      } finally {
        clearTimeout(timeout);
        if (!cancelled) {
          setRestoring(false);
        }
      }
    }
    restoreSession();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  const login = useCallback(async (email: string, pin: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin, action: "login" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Authentication failed`);
      const json = await res.json();
      if (json.success) { setUser(json.data.user); return json.data; }
      else { setError(json.error.message); return null; }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Login failed"); return null; }
    finally { setLoading(false); }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(API_ENDPOINTS.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Best-effort — clear local state regardless
    }
    setUser(null);
  }, []);

  const isBusiness = user?.role === "business_owner" || user?.role === "business";
  const isInfluencer = user?.role === "influencer";
  const isAdmin = user?.role === "admin";

  return { user, setUser, login, logout, loading, restoring, error, isBusiness, isInfluencer, isAdmin };
}
