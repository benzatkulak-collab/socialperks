import { redirect } from "next/navigation";

interface RefPageProps {
  params: Promise<{ code: string }>;
}

/**
 * Referral redirect page.
 * When someone visits /ref/REF-XXXX-XXXX, redirect to the signup flow with the
 * referral code as a real QUERY param (not inside the hash). RefCapture reads
 * window.location.search, which excludes the hash — so "#signup?ref=" left the
 * code unreadable and the cookie was never set. "?ref=…#signup" is captured,
 * then RefCapture strips ?ref while preserving the #signup hash.
 */
export default async function RefPage({ params }: RefPageProps) {
  const { code } = await params;
  redirect(`/dashboard?ref=${encodeURIComponent(code)}#signup`);
}
