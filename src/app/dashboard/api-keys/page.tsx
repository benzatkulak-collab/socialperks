/**
 * /dashboard/api-keys — Manage personal API keys
 *
 * Server component: validates session via cookie. If unauthed,
 * redirects to /dashboard#login. Otherwise hands off to the client
 * component which talks to /api/v1/api-keys.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyJWT } from "@/lib/auth";
import { ApiKeysClient } from "./api-keys-client";

export const metadata: Metadata = {
  title: "API Keys · Social Perks",
  description: "Issue and revoke personal API keys for integrating Social Perks into your stack.",
  robots: { index: false, follow: false },
};

export default async function ApiKeysPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sp-access-token")?.value;
  const session = token ? verifyJWT(token) : null;

  if (!session || !session.businessId) {
    redirect("/dashboard#login");
  }

  return (
    <ApiKeysClient
      businessId={session.businessId}
      businessEmail={session.email}
    />
  );
}
