"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findNavItem } from "./nav-config";

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export function AdminTopbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        if (j?.success && j.data?.user) setUser(j.data.user);
      })
      .catch(() => {});
    // Read impersonation marker (non-HttpOnly cookie set by impersonate API)
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/sp-impersonating=([^;]+)/);
      if (match) setImpersonating(decodeURIComponent(match[1]));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
  };

  const handleExitImpersonation = async () => {
    await fetch("/api/v1/admin/impersonate", {
      method: "DELETE",
      credentials: "include",
    });
    router.refresh();
    window.location.reload();
  };

  const current = findNavItem(pathname);
  const envBadge =
    process.env.NEXT_PUBLIC_ENV === "production"
      ? { color: "red" as const, label: "PROD" }
      : process.env.NEXT_PUBLIC_ENV === "staging"
      ? { color: "amber" as const, label: "STAGING" }
      : { color: "cyan" as const, label: "DEV" };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-bg/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-heading text-base text-brand-white italic truncate">
            {current?.label ?? "Admin"}
          </h1>
          <Badge color={envBadge.color} size="sm">
            {envBadge.label}
          </Badge>
          {impersonating && (
            <Badge color="amber" dot size="sm">
              Impersonating
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {impersonating && (
            <Button variant="outline" size="sm" onClick={handleExitImpersonation}>
              Exit impersonation
            </Button>
          )}
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-brand-muted font-mono">{user.email}</span>
              <Badge color={user.role === "admin" ? "red" : "muted"} size="sm">
                {user.role}
              </Badge>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
