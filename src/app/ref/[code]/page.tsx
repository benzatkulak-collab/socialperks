import { redirect } from "next/navigation";

interface RefPageProps {
  params: Promise<{ code: string }>;
}

/**
 * Referral redirect page.
 * When someone visits /ref/REF-XXXX-XXXX, redirect to the signup flow
 * with the referral code in the URL so it can be captured during registration.
 */
export default async function RefPage({ params }: RefPageProps) {
  const { code } = await params;
  redirect(`/auth?ref=${encodeURIComponent(code)}`);
}
