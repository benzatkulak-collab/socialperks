"use client";

interface Feature {
  icon: string;
  text: string;
}

interface AudienceBlock {
  id: string;
  label: string;
  heading: string;
  description: string;
  features: Feature[];
  proof: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
}

const AUDIENCES: AudienceBlock[] = [
  {
    id: "businesses",
    label: "For Small Businesses",
    heading: "Built for businesses like yours",
    description:
      "Whether you run a coffee shop, yoga studio, or auto repair, Social Perks turns your happy customers into your best marketers. No agency needed.",
    features: [
      { icon: "⭐", text: "One-click review campaigns" },
      { icon: "📲", text: "QR codes for your counter" },
      { icon: "🎁", text: "Custom perks that match your budget" },
      { icon: "📊", text: "See what's working with simple analytics" },
    ],
    proof: "312 local businesses already growing",
    accentBg: "bg-brand-green/10",
    accentText: "text-brand-green",
    accentBorder: "border-brand-green/20",
  },
  {
    id: "influencers",
    label: "For Influencers",
    heading: "Get paid to do what you already do",
    description:
      "You eat out, shop local, and try new things. Now get rewarded for sharing those experiences. Set your rates, build your portfolio, grow your income.",
    features: [
      { icon: "💰", text: "Set your rates" },
      { icon: "🔍", text: "Get discovered by brands" },
      { icon: "📈", text: "Track your earnings" },
      { icon: "🎨", text: "Build your portfolio" },
    ],
    proof: "Join 2,400+ creators earning through Social Perks",
    accentBg: "bg-brand-purple/10",
    accentText: "text-brand-purple",
    accentBorder: "border-brand-purple/20",
  },
  {
    id: "enterprise",
    label: "For Enterprise",
    heading: "Scale word-of-mouth across every location",
    description:
      "Manage campaigns across dozens or hundreds of locations. Maintain brand consistency. Get the analytics your leadership team needs.",
    features: [
      { icon: "🏢", text: "Multi-location management" },
      { icon: "🛡️", text: "Brand compliance controls" },
      { icon: "🔗", text: "API & integrations" },
      { icon: "📋", text: "Advanced analytics & reporting" },
    ],
    proof: "Trusted by brands managing 50+ locations",
    accentBg: "bg-brand-amber/10",
    accentText: "text-brand-amber",
    accentBorder: "border-brand-amber/20",
  },
];

function AudienceCard({
  audience,
  index,
}: {
  audience: AudienceBlock;
  index: number;
}) {
  const isReversed = index % 2 === 1;

  return (
    <div
      id={audience.id}
      className={`flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 ${
        isReversed ? "lg:flex-row-reverse" : ""
      }`}
    >
      {/* Content */}
      <div className="flex-1">
        <span
          className={`mb-4 inline-block rounded-full border ${audience.accentBorder} ${audience.accentBg} px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider ${audience.accentText}`}
        >
          {audience.label}
        </span>
        <h3 className="mb-4 font-heading text-3xl italic text-brand-white sm:text-4xl">
          {audience.heading}
        </h3>
        <p className="mb-8 max-w-lg text-base leading-relaxed text-brand-dim sm:text-lg">
          {audience.description}
        </p>

        {/* Features */}
        <ul className="mb-8 space-y-4" role="list">
          {audience.features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-3">
              <span className="mt-0.5 text-lg" aria-hidden="true">
                {feature.icon}
              </span>
              <span className="text-base text-brand-text">{feature.text}</span>
            </li>
          ))}
        </ul>

        {/* Social proof */}
        <p className={`font-mono text-sm ${audience.accentText}`}>
          {audience.proof}
        </p>
      </div>

      {/* Visual card / illustration */}
      <div className="flex flex-1 items-center justify-center">
        <div
          className={`w-full max-w-md rounded-2xl border ${audience.accentBorder} bg-brand-surface/50 p-8 backdrop-blur-sm sm:p-10`}
        >
          {/* Mock dashboard header */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${audience.accentBg}`}
            >
              <span className="text-xl" aria-hidden="true">
                {audience.features[0].icon}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-white">
                {audience.id === "businesses"
                  ? "Campaign Dashboard"
                  : audience.id === "influencers"
                  ? "Creator Portal"
                  : "Enterprise Console"}
              </p>
              <p className="text-xs text-brand-muted">
                {audience.id === "businesses"
                  ? "3 active campaigns"
                  : audience.id === "influencers"
                  ? "12 brand opportunities"
                  : "47 locations connected"}
              </p>
            </div>
          </div>

          {/* Mock metrics */}
          <div className="grid grid-cols-2 gap-4">
            {(audience.id === "businesses"
              ? [
                  { label: "New reviews", val: "+28" },
                  { label: "Posts this week", val: "47" },
                  { label: "Perk redemptions", val: "156" },
                  { label: "Est. value", val: "$2.1K" },
                ]
              : audience.id === "influencers"
              ? [
                  { label: "Earned this month", val: "$840" },
                  { label: "Campaigns active", val: "6" },
                  { label: "Total reach", val: "89K" },
                  { label: "Brand matches", val: "24" },
                ]
              : [
                  { label: "Locations", val: "54" },
                  { label: "Active campaigns", val: "120" },
                  { label: "Monthly actions", val: "12.4K" },
                  { label: "ROI", val: "340%" },
                ]
            ).map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-brand-border/30 bg-brand-bg/50 px-3 py-3"
              >
                <p className="font-mono text-lg font-semibold text-brand-white">
                  {metric.val}
                </p>
                <p className="text-xs text-brand-muted">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AudienceSections() {
  return (
    <section
      className="relative bg-brand-bg py-24 sm:py-32"
      aria-label="Who Social Perks is for"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-border to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-16 text-center sm:mb-20">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-brand-cyan">
            Built for everyone
          </p>
          <h2 className="font-heading text-3xl italic text-brand-white sm:text-4xl lg:text-5xl">
            One platform, every side of marketing
          </h2>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {AUDIENCES.map((audience, i) => (
            <AudienceCard key={audience.id} audience={audience} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
