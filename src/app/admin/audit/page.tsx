import type { Metadata } from "next";
import { AuditClient } from "./client";

export const metadata: Metadata = {
  title: "Audit log — Admin · Social Perks",
  description: "Security-sensitive operation audit log. Admin only.",
  robots: { index: false, follow: false },
};

export default function AuditPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="font-heading text-xl text-brand-white font-semibold italic mb-2">
            Audit log
          </h1>
          <p className="text-sm text-brand-muted">
            Security-sensitive operations: auth, API keys, billing, submission
            reviews, webhook signatures. Reading this page is itself audited.
          </p>
        </header>
        <AuditClient />
      </div>
    </div>
  );
}
