import type { Metadata } from "next";
import { ClaimsReviewClient } from "./client";

export const metadata: Metadata = {
  title: "Claim Submissions — Social Perks",
  description:
    "Review pending public claim submissions from customers and mark perks as redeemed at checkout.",
  robots: { index: false, follow: false },
};

export default function ClaimsReviewPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-8">
          <h1 className="font-serif text-4xl italic text-brand-white mb-3">
            Claim Submissions
          </h1>
          <p className="text-brand-text-dim">
            Customers who scanned your claim sticker, posted on social, and
            verified their phone or email show up here. Tap{" "}
            <span className="text-brand-white">Redeem</span> when they show
            you the code at checkout.
          </p>
        </header>
        <ClaimsReviewClient />
      </div>
    </div>
  );
}
