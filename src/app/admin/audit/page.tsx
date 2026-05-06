import type { Metadata } from "next";
import { AuditClient } from "./client";

export const metadata: Metadata = {
  title: "Audit log — Admin · Social Perks",
  description: "Security-sensitive operation audit log. Admin only.",
  robots: { index: false, follow: false },
};

export default function AuditPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8">
          <p className="text-sm text-brand-text-dim mb-2">Admin</p>
          <h1 className="font-serif text-4xl italic text-brand-white mb-3">
            Audit log
          </h1>
          <p className="text-brand-text-dim">
            Security-sensitive operations: auth, API keys, billing, submission
            reviews, webhook signatures. Reading this page is itself audited.
          </p>
        </header>
        <AuditClient />
      </div>
    </div>
  );
}
