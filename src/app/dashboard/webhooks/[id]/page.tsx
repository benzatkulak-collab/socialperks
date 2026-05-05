/**
 * /dashboard/webhooks/[id] — Webhook delivery log
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifyJWT } from "@/lib/auth";
import { DeliveriesClient } from "./deliveries-client";

export const metadata: Metadata = {
  title: "Webhook deliveries · Social Perks",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WebhookDeliveriesPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sp-access-token")?.value;
  const session = token ? verifyJWT(token) : null;

  if (!session || !session.businessId) {
    redirect("/dashboard#login");
  }

  const { id } = await params;

  return <DeliveriesClient webhookId={id} />;
}
