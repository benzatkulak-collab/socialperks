"use client";
import { useState, useCallback } from "react";
import { API_ENDPOINTS } from "@/lib/shared/constants";

interface User { id: string; email: string; name: string; role: string; }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const logout = useCallback(() => { setUser(null); }, []);

  const isBusiness = user?.role === "business_owner";
  const isInfluencer = user?.role === "influencer";
  const isAdmin = user?.role === "admin";

  return { user, login, logout, loading, error, isBusiness, isInfluencer, isAdmin };
}
