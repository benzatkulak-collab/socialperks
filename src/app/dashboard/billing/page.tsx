import type { Metadata } from "next";
import { BillingClient } from "./client";

export const metadata: Metadata = {
  title: "Billing — Social Perks",
  description: "Manage your subscription, view usage, and update payment methods.",
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10">
          <h1 className="font-serif text-4xl italic text-brand-white mb-3">
            Billing
          </h1>
          <p className="text-brand-text-dim text-lg">
            Manage your subscription, view current usage, and update payment
            methods.
          </p>
        </header>
        <BillingClient />
      </div>
    </div>
  );
}
