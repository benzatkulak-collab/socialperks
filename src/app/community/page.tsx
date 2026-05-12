import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

export const metadata: Metadata = {
  title: "Join the Social Perks community",
  description:
    "Connect with 1,200+ small business owners, creators, and marketers using Social Perks. Discord, X, and our weekly newsletter.",
  alternates: { canonical: "https://socialperks.app/community" },
  openGraph: {
    title: "Join the Social Perks community",
    description:
      "Discord, X, and a weekly newsletter — meet other founders, creators, and marketers running perks campaigns.",
    url: "https://socialperks.app/community",
    type: "website",
    siteName: "Social Perks",
  },
};

interface Channel {
  id: "discord" | "twitter" | "newsletter";
  name: string;
  href: string;
  members: string;
  lastActive: string;
  blurb: string;
  cta: string;
  external: boolean;
}

const CHANNELS: Channel[] = [
  {
    id: "discord",
    name: "Discord",
    href: "https://discord.gg/socialperks",
    members: "2,184 members",
    lastActive: "Active 2 minutes ago",
    blurb:
      "Real-time chat with other founders, creators, and the Social Perks team. Channels for #campaigns, #wins, #questions, and #show-and-tell.",
    cta: "Join Discord",
    external: true,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    href: "/launch/tweets",
    members: "9,431 followers",
    lastActive: "Posted 6 hours ago",
    blurb:
      "Daily product updates, customer wins, and small-business marketing tips. Tag @socialperks to be featured.",
    cta: "Follow on X",
    external: false,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    href: "#newsletter-signup",
    members: "12,508 subscribers",
    lastActive: "Sent yesterday",
    blurb:
      "Friday digest: top-performing campaigns, new features, and one playbook a week. No spam, unsubscribe anytime.",
    cta: "Subscribe",
    external: false,
  },
];

function Icon({ id }: { id: Channel["id"] }) {
  const cls = "h-6 w-6";
  switch (id) {
    case "discord":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M19.27 5.33A18.5 18.5 0 0 0 14.78 4l-.22.43A17 17 0 0 1 18.4 5.7C16.4 4.74 14.23 4.2 12 4.2s-4.4.55-6.4 1.5a17 17 0 0 1 3.83-1.27L9.21 4A18.5 18.5 0 0 0 4.73 5.33C2.33 8.95 1.7 12.45 2 15.9c1.85 1.36 3.65 2.18 5.42 2.72.4-.55.76-1.13 1.07-1.74-.6-.22-1.18-.5-1.73-.83.15-.1.29-.21.42-.32a13 13 0 0 0 11.62 0c.13.11.27.22.42.32-.55.33-1.13.61-1.73.83.31.61.67 1.19 1.07 1.74 1.77-.54 3.57-1.36 5.42-2.72.34-3.96-.49-7.43-2.74-10.57M9.5 14.13c-1.06 0-1.93-.97-1.93-2.18 0-1.21.85-2.18 1.93-2.18s1.93.97 1.93 2.18c0 1.21-.85 2.18-1.93 2.18m4.99 0c-1.06 0-1.93-.97-1.93-2.18 0-1.21.85-2.18 1.93-2.18s1.93.97 1.93 2.18c0 1.21-.85 2.18-1.93 2.18" />
        </svg>
      );
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "newsletter":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m1 2.6V18h16V7.6l-8 5.33z" />
        </svg>
      );
  }
}

const ACCENT: Record<Channel["id"], { ring: string; text: string; bg: string }> = {
  discord: {
    ring: "border-indigo-400/40",
    text: "text-indigo-300",
    bg: "bg-indigo-400/10",
  },
  twitter: {
    ring: "border-brand-cyan/40",
    text: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
  },
  newsletter: {
    ring: "border-brand-green/40",
    text: "text-brand-green",
    bg: "bg-brand-green/10",
  },
};

export default function CommunityPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-bg">
      <Nav />
      <main id="main-content" className="pt-28 pb-20 sm:pt-36">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <header className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-cyan">
              Community
            </p>
            <h1 className="mt-4 font-heading text-4xl italic leading-tight text-brand-white sm:text-5xl">
              Join the Social Perks community
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-dim">
              Three places to connect with other small-business owners,
              creators, and the Social Perks team.
            </p>
          </header>

          <section className="mt-14 grid gap-5 md:grid-cols-3">
            {CHANNELS.map((c) => {
              const accent = ACCENT[c.id];
              return (
                <article
                  key={c.id}
                  className={`flex flex-col rounded-2xl border ${accent.ring} bg-brand-card/30 p-6`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}
                  >
                    <Icon id={c.id} />
                  </div>
                  <h2 className="mt-4 font-heading text-2xl italic text-brand-white">
                    {c.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-brand-muted">
                    <span>{c.members}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-green"
                      />
                      {c.lastActive}
                    </span>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-brand-dim">
                    {c.blurb}
                  </p>
                  {c.external ? (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg border ${accent.ring} ${accent.bg} px-4 py-2.5 text-sm font-medium ${accent.text} transition-colors hover:bg-brand-card/60`}
                    >
                      {c.cta}
                      <span aria-hidden>→</span>
                    </a>
                  ) : (
                    <Link
                      href={c.href}
                      className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg border ${accent.ring} ${accent.bg} px-4 py-2.5 text-sm font-medium ${accent.text} transition-colors hover:bg-brand-card/60`}
                    >
                      {c.cta}
                      <span aria-hidden>→</span>
                    </Link>
                  )}
                </article>
              );
            })}
          </section>

          {/* Newsletter inline form */}
          <section
            id="newsletter-signup"
            className="mt-16 rounded-2xl border border-brand-border/50 bg-brand-card/30 p-8"
          >
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
                  Get the Friday digest
                </h2>
                <p className="mt-2 text-brand-dim">
                  One email a week. Top campaigns, product updates, and a
                  playbook from the community.
                </p>
              </div>
              <form
                action="/api/v1/newsletter"
                method="post"
                className="flex w-full flex-col gap-2 sm:flex-row md:w-auto"
              >
                <label htmlFor="community-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="community-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@business.com"
                  className="w-full rounded-lg border border-brand-border/60 bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-cyan focus:outline-none sm:w-72"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-brand-cyan px-5 py-2.5 text-sm font-medium text-brand-bg transition-transform hover:-translate-y-0.5"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </section>

          <p className="mt-12 text-center text-sm text-brand-muted">
            Be kind. No spam. Help each other ship.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
