/**
 * /dashboard/webhooks — Webhook subscription management
 *
 * Server component: validates session via cookie. If unauthed,
 * redirects to /dashboard#login. Otherwise hands off to the
 * client component which talks to /api/v1/webhooks.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyJWT } from "@/lib/auth";
import { WebhooksClient } from "./webhooks-client";

export const metadata: Metadata = {
  title: "Webhooks · Social Perks",
  description: "Manage outbound webhook subscriptions for real-time event delivery.",
  robots: { index: false, follow: false },
};

export default async function WebhooksPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sp-access-token")?.value;
  const session = token ? verifyJWT(token) : null;

  if (!session || !session.businessId) {
    redirect("/dashboard#login");
  }

  return (
    <WebhooksClient
      businessId={session.businessId}
      businessEmail={session.email}
    />
  );
}
