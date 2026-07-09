import Link from "next/link";
import { safeJsonForScript } from "@/lib/security/json-ld";
import {
  SOCIAL_PERKS_COST,
  COMPETING_CHANNELS,
  COST_FAQ,
  costAdvantage,
  type CostChannel,
} from "@/lib/cost-comparison";

/**
 * Cost-per-outcome comparison for the /pricing page.
 *
 * Anchors a buyer's economics: what a completed customer action costs on
 * Social Perks vs a conversion on the paid-ad channels they're already
 * weighing. Numbers come from `src/lib/cost-comparison.ts` (same figures
 * as the /vs pages) and are rendered visually AND as FAQPage structured
 * data — the on-page content and the JSON-LD must always match.
 *
 * Pure server component: no client state, no analytics — just content
 * and structured data, which is what search crawlers reward.
 */

function CostRow({
  channel,
  highlight,
}: {
  channel: CostChannel;
  highlight?: boolean;
}) {
  const advantage = highlight ? null : costAdvantage(channel);
  return (
    <tr className="border-b border-brand-border last:border-0">
      <td className="p-3 sm:p-4">
        <div
          className={
            highlight
              ? "font-medium text-brand-cyan"
              : "font-medium text-brand-text"
          }
        >
          {channel.vsSlug ? (
            <Link
              href={`/vs/${channel.vsSlug}`}
              className="hover:text-brand-cyan hover:underline"
            >
              {channel.name}
            </Link>
          ) : (
            channel.name
          )}
        </div>
        <div className="mt-0.5 text-xs text-brand-text-dim">{channel.model}</div>
      </td>
      <td
        className={`p-3 sm:p-4 whitespace-nowrap font-mono text-sm ${
          highlight ? "text-brand-cyan font-semibold" : "text-brand-text"
        }`}
      >
        {channel.costPerOutcome}
      </td>
      <td className="hidden p-3 text-sm text-brand-text-dim sm:table-cell sm:p-4">
        {highlight ? (
          <span className="text-brand-green">Baseline</span>
        ) : (
          <span>
            <span className="text-brand-text">{advantage}</span> more per
            conversion
          </span>
        )}
      </td>
    </tr>
  );
}

export function CostComparisonSection() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COST_FAQ.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section
      className="relative bg-brand-bg py-16 sm:py-20"
      aria-label="Cost comparison"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(faqLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="text-center">
          <h2 className="font-heading text-[clamp(1.5rem,3.5vw,2.5rem)] italic text-brand-white leading-[1.15]">
            What a customer action actually costs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-dim">
            You pay a small perk only when a real customer completes and submits
            an action — not for impressions or clicks. Here&apos;s how that
            compares to buying the same conversion from an ad platform.
          </p>
        </header>

        <div className="mt-10 overflow-hidden rounded-xl border border-brand-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-card">
                <th className="p-3 text-sm font-medium text-brand-text-dim sm:p-4">
                  Channel
                </th>
                <th className="p-3 text-sm font-medium text-brand-text-dim sm:p-4">
                  Cost per conversion
                </th>
                <th className="hidden p-3 text-sm font-medium text-brand-text-dim sm:table-cell sm:p-4">
                  vs Social Perks
                </th>
              </tr>
            </thead>
            <tbody>
              <CostRow channel={SOCIAL_PERKS_COST} highlight />
              {COMPETING_CHANNELS.map((c) => (
                <CostRow key={c.name} channel={c} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-brand-text-dim">
          Typical local-business ranges, not guarantees — actual cost depends on
          your perk value, category, and participation. Ad figures reflect
          marginal cost per conversion for small businesses. See the full{" "}
          <Link href="/vs/meta-ads" className="text-brand-cyan hover:underline">
            head-to-head comparisons
          </Link>{" "}
          for the math.
        </p>

        <div className="mt-12 space-y-6">
          {COST_FAQ.map((f) => (
            <div
              key={f.question}
              className="rounded-lg border border-brand-border bg-brand-card p-5"
            >
              <h3 className="text-sm font-medium text-brand-white">
                {f.question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-text-dim">
                {f.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
