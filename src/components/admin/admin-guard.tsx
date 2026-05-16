"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  businessId?: string | null;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({ user: null });

export function useAdminUser(): AdminUser | null {
  return useContext(AdminAuthContext).user;
}

/**
 * Wraps admin pages. Client-side guard that verifies the user is
 * admin or enterprise; renders denied state otherwise. Children only
 * render after the auth check passes.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/auth", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) {
            setAuthorized(false);
            setChecked(true);
          }
          return;
        }
        const json = await res.json();
        const u = json?.data?.user;
        const ok = json?.success && (u?.role === "admin" || u?.role === "enterprise");
        if (!cancelled) {
          setUser(u ?? null);
          setAuthorized(!!ok);
          setChecked(true);
        }
      } catch {
        if (!cancelled) {
          setAuthorized(false);
          setChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return (
      <div className="p-8">
        <Skeleton width="w-48" height="h-8" rounded="lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <Card padding="lg" borderColor="red" className="max-w-md w-full text-center">
          <h1 className="font-heading text-xl text-brand-white font-semibold mb-2">
            Access Denied
          </h1>
          <p className="text-brand-muted text-sm mb-4">
            You must be logged in with an admin role to access this page.
          </p>
          <Badge color="red" size="md">
            Insufficient Permissions
          </Badge>
        </Card>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ user }}>{children}</AdminAuthContext.Provider>
  );
}
