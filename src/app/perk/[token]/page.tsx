import type { Metadata } from "next";
import Link from "next/link";
import { getWallet, hydrateWallets } from "@/lib/perk-wallet";
import { verifyPerkToken } from "@/lib/security/perk-link";
import { createSeedData } from "@/lib/seed";
import { getUserByBusinessId, ensureUsersSeeded } from "@/lib/auth/user-store";
import { PerkCard, type RedeemablePerk } from "@/components/perk/perk-redeem-client";

// Private magic-link page — never index it.
export const metadata: Metadata = {
  title: "Your perk · Social Perks",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

/** Resolve a business's display name (seed data → real auth_users). */
async function businessName(businessId: string): Promise<string> {
  const seeded = createSeedData().businesses.find((b) => b.id === businessId);
  if (seeded) return seeded.name;
  try {
    await ensureUsersSeeded();
    const user = getUserByBusinessId(businessId);
    if (user) return user.name;
  } catch {
    /* degrade to a generic label */
  }
  return "Your reward";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

export default async function PerkPage({ params }: PageProps) {
  const { token } = await params;
  const userId = verifyPerkToken(token);

  if (!userId) {
    return (
      <Shell>
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 text-center">
          <p className="font-heading text-2xl italic text-brand-white">
            Link expired
          </p>
          <p className="mt-2 text-sm text-brand-dim">
            This perk link is invalid or has expired. If you earned a perk
            recently, check your email for the latest link.
          </p>
        </div>
      </Shell>
    );
  }

  await hydrateWallets();
  const wallets = getWallet(userId);
  const allPerks = wallets.flatMap((w) =>
    w.perks.map((p) => ({ businessId: w.businessId, perk: p }))
  );

  // Active first, then redeemed, then expired; newest within each.
  const rank = (s: string) => (s === "active" ? 0 : s === "redeemed" ? 1 : 2);
  allPerks.sort(
    (a, b) =>
      rank(a.perk.status) - rank(b.perk.status) ||
      new Date(b.perk.earnedAt).getTime() - new Date(a.perk.earnedAt).getTime()
  );

  // Resolve business names once per business.
  const names = new Map<string, string>();
  for (const { businessId } of allPerks) {
    if (!names.has(businessId)) names.set(businessId, await businessName(businessId));
  }

  return (
    <Shell>
      <header className="mb-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan">
          Social Perks
        </p>
        <h1 className="mt-1 font-heading text-3xl italic text-brand-white">
          Your perks
        </h1>
        <p className="mt-1 text-sm text-brand-dim">
          Earned for sharing the businesses you love.
        </p>
      </header>

      {allPerks.length === 0 ? (
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 text-center">
          <p className="text-sm text-brand-dim">
            You don&apos;t have any perks yet. Once a business approves your post,
            your reward will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allPerks.map(({ businessId, perk }) => (
            <PerkCard
              key={perk.id}
              token={token}
              businessName={names.get(businessId) ?? "Your reward"}
              perk={perk as RedeemablePerk}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-brand-muted">
        Powered by{" "}
        <Link href="/" className="text-brand-cyan hover:underline">
          Social Perks
        </Link>
      </p>
    </Shell>
  );
}
