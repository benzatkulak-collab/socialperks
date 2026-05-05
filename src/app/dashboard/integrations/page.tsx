/**
 * /dashboard/integrations — Manage authorized agent apps
 *
 * Server component: validates session via cookie. If unauthed,
 * redirects to /dashboard#login. Otherwise hands off to the client
 * component which talks to /api/v1/integrations.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyJWT } from "@/lib/auth";
import { IntegrationsClient } from "./integrations-client";

export const metadata: Metadata = {
  title: "Integrations · Social Perks",
  description: "Manage AI agents and third-party tools authorized to act on behalf of your shop.",
  robots: { index: false, follow: false },
};

export default async function IntegrationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sp-access-token")?.value;
  const session = token ? verifyJWT(token) : null;

  if (!session || !session.businessId) {
    redirect("/dashboard#login");
  }

  return (
    <IntegrationsClient
      businessId={session.businessId}
      businessEmail={session.email}
    />
  );
}
