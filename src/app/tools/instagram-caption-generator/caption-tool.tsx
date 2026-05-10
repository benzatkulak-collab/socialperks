"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Vibe = "casual" | "professional" | "funny";

interface BusinessType {
  id: string;
  label: string;
  hashtags: string[];
}

const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "cafe",
    label: "Cafe / Coffee shop",
    hashtags: [
      "coffeelover",
      "cafelife",
      "specialtycoffee",
      "thirdwavecoffee",
      "coffeegram",
      "localcafe",
      "coffeetime",
      "baristalife",
      "espresso",
      "morningbrew",
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    hashtags: [
      "foodie",
      "instafood",
      "foodstagram",
      "eaterlocal",
      "chefsofinstagram",
      "foodphotography",
      "yum",
      "dinnertime",
      "supportlocal",
      "foodgram",
    ],
  },
  {
    id: "bakery",
    label: "Bakery",
    hashtags: [
      "bakery",
      "freshbaked",
      "sourdough",
      "pastrylove",
      "bakerylife",
      "homemade",
      "artisanbread",
      "bakedfromscratch",
      "bakerystyle",
      "freshbread",
    ],
  },
  {
    id: "fitness",
    label: "Gym / Fitness studio",
    hashtags: [
      "fitnessmotivation",
      "gymlife",
      "trainhard",
      "fitfam",
      "workout",
      "strongnotskinny",
      "fitnessjourney",
      "sweatdaily",
      "personaltrainer",
      "movemore",
    ],
  },
  {
    id: "salon",
    label: "Salon / Hair / Nails",
    hashtags: [
      "hairsalon",
      "behindthechair",
      "hairgoals",
      "nailsofinstagram",
      "salonlife",
      "balayage",
      "hairtransformation",
      "nailart",
      "hairstylist",
      "glowup",
    ],
  },
  {
    id: "boutique",
    label: "Boutique / Retail",
    hashtags: [
      "shoplocal",
      "boutiquefashion",
      "smallshopbiglove",
      "newarrivals",
      "shopthelook",
      "ootd",
      "supportsmallbusiness",
      "boutiquestyle",
      "fashionfinds",
      "shopsmall",
    ],
  },
  {
    id: "yoga",
    label: "Yoga / Wellness",
    hashtags: [
      "yogaeverydamnday",
      "mindfulliving",
      "yogapractice",
      "wellnessjourney",
      "selfcare",
      "yogalife",
      "breathe",
      "mindbodysoul",
      "wellnesscommunity",
      "yogainspiration",
    ],
  },
  {
    id: "florist",
    label: "Florist",
    hashtags: [
      "floristsofinstagram",
      "floraldesign",
      "flowersofinstagram",
      "freshflowers",
      "weddingflowers",
      "bouquetoftheday",
      "blooms",
      "petalsandposies",
      "flowerlover",
      "floralart",
    ],
  },
  {
    id: "petcare",
    label: "Pet care / Vet / Groomer",
    hashtags: [
      "dogsofinstagram",
      "catsofinstagram",
      "petsalon",
      "petgroomer",
      "petlovers",
      "doggrooming",
      "happypets",
      "pawsome",
      "vetlife",
      "petsmile",
    ],
  },
  {
    id: "tattoo",
    label: "Tattoo / Ink studio",
    hashtags: [
      "tattooart",
      "inkedup",
      "tattooartist",
      "tattoosofinstagram",
      "blackworktattoo",
      "tattoodesign",
      "inkaddict",
      "fineline",
      "customtattoo",
      "tattooshop",
    ],
  },
  {
    id: "homegoods",
    label: "Home goods / Decor",
    hashtags: [
      "homedecor",
      "interiorinspo",
      "interiordesign",
      "homestyle",
      "homedecorlovers",
      "shopsmall",
      "boho",
      "modernhome",
      "neutralhome",
      "homefinds",
    ],
  },
  {
    id: "service",
    label: "Local service (cleaning, repair, etc.)",
    hashtags: [
      "smallbusiness",
      "shoplocal",
      "supportsmall",
      "localbusiness",
      "smallbusinessowner",
      "communityfirst",
      "qualityservice",
      "trustedlocal",
      "behindthebusiness",
      "ownerlife",
    ],
  },
];

const HOOKS: Record<Vibe, string[]> = {
  casual: [
    "Okay, real talk:",
    "PSA:",
    "Don't tell anyone, but",
    "Hot take —",
    "Currently obsessed with",
    "If you know, you know.",
    "Quick story:",
    "So this happened today —",
    "Reminder that",
    "We're not crying, you are.",
  ],
  professional: [
    "Behind every great experience is a thoughtful detail.",
    "We believe craft matters.",
    "Quality over everything.",
    "Built for the people who notice the small things.",
    "Excellence is in the details.",
    "Made with intention.",
    "Our standard is simple: do it right.",
    "Where details meet dedication.",
    "Crafted to last.",
    "Designed with you in mind.",
  ],
  funny: [
    "POV: you walked in for one thing.",
    "Me: I'll be quick. Also me, an hour later:",
    "Tell me you love us without telling me you love us.",
    "Plot twist:",
    "Things we didn't have on the bingo card today:",
    "Therapist: and how does that make you feel?",
    "When the regulars become family —",
    "Listen, we tried to keep it together.",
    "Breaking news from the front lines:",
    "If this isn't a love language, we don't know what is.",
  ],
};

const CTAS: Record<Vibe, string[]> = {
  casual: [
    "Come hang. We'll be here.",
    "Tag someone who needs to see this 👀",
    "Stop by, say hi.",
    "Drop a 🙌 if you're with us.",
    "Save this for later. You'll thank us.",
    "Tell us in the comments — what's your go-to?",
  ],
  professional: [
    "Visit us today to experience it for yourself.",
    "Book your appointment via the link in bio.",
    "Discover more on our website.",
    "Reach out — we'd love to hear from you.",
    "Reservations recommended. Link in bio.",
    "Get in touch to learn more.",
  ],
  funny: [
    "We accept payment in compliments and reviews ✨",
    "Tag your partner-in-crime. Or your dog. We don't judge.",
    "Slide into our DMs. Or just walk in. Either works.",
    "Come visit, bring snacks (jk we have those).",
    "If you don't show up we will personally text you.",
    "Comment '🙋' if you're on your way.",
  ],
};

function pickFrom<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function buildCaption({
  hook,
  topic,
  business,
  cta,
  hashtags,
}: {
  hook: string;
  topic: string;
  business: string;
  cta: string;
  hashtags: string[];
}): string {
  const cleanTopic = topic.trim() || "today's special";
  const cleanBiz = business.trim();
  const tagged = hashtags.map((h) => `#${h}`).join(" ");
  const bizLine = cleanBiz ? `\n\n— ${cleanBiz}` : "";
  return `${hook} ${cleanTopic}.${bizLine}\n\n${cta}\n\n${tagged}`;
}

interface Caption {
  id: number;
  text: string;
}

export function CaptionTool() {
  const [businessTypeId, setBusinessTypeId] = useState<string>("cafe");
  const [businessName, setBusinessName] = useState("");
  const [topic, setTopic] = useState("");
  const [vibe, setVibe] = useState<Vibe>("casual");
  const [seed, setSeed] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const businessType = useMemo(
    () =>
      BUSINESS_TYPES.find((b) => b.id === businessTypeId) ?? BUSINESS_TYPES[0],
    [businessTypeId],
  );

  const captions: Caption[] = useMemo(() => {
    const hooks = HOOKS[vibe];
    const ctas = CTAS[vibe];
    const pool = businessType.hashtags;

    return [0, 1, 2].map((i) => {
      const hook = pickFrom(hooks, seed + i * 3);
      const cta = pickFrom(ctas, seed + i * 5 + 1);
      // Pick 5-7 hashtags, rotating starting position
      const start = (seed + i * 2) % pool.length;
      const count = 6;
      const tags: string[] = [];
      for (let j = 0; j < count; j++) {
        tags.push(pool[(start + j) % pool.length]);
      }
      // Always include a couple universal small-biz tags
      const universal = ["smallbusiness", "shoplocal", "supportlocal"];
      const uni = universal[(seed + i) % universal.length];
      if (!tags.includes(uni)) tags.push(uni);

      return {
        id: i,
        text: buildCaption({
          hook,
          topic,
          business: businessName,
          cta,
          hashtags: tags,
        }),
      };
    });
  }, [vibe, seed, businessType, topic, businessName]);

  async function handleCopy(caption: Caption) {
    try {
      await navigator.clipboard.writeText(caption.text);
      setCopiedId(caption.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      {/* Form */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6 sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="biz-type"
              className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted"
            >
              Business type
            </label>
            <select
              id="biz-type"
              value={businessTypeId}
              onChange={(e) => setBusinessTypeId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2.5 text-sm text-brand-text focus:border-brand-cyan/50 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="biz-name"
              className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted"
            >
              Business name <span className="text-brand-muted/60">(optional)</span>
            </label>
            <input
              id="biz-name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Sol Bakery"
              className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="topic"
              className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted"
            >
              What&apos;s the post about?
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="our new chai latte"
              className="mt-2 w-full rounded-lg border border-brand-border bg-brand-bg/50 px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-cyan/50 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
              Vibe
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["casual", "professional", "funny"] as Vibe[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVibe(v)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-all ${
                    vibe === v
                      ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                      : "border-brand-border bg-brand-surface/30 text-brand-dim hover:border-brand-subtle hover:text-brand-text"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="rounded-lg border border-brand-border bg-brand-surface/50 px-4 py-2 text-xs font-medium text-brand-text transition-all hover:border-brand-cyan/40 hover:bg-brand-surface"
          >
            ↻ Regenerate
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {captions.map((caption, idx) => (
          <div
            key={caption.id}
            className="flex flex-col rounded-2xl border border-brand-border bg-brand-surface/40 p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-muted">
                Option {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(caption)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  copiedId === caption.id
                    ? "bg-brand-green/20 text-brand-green"
                    : "bg-brand-cyan text-brand-bg hover:bg-cyan-300"
                }`}
              >
                {copiedId === caption.id ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre className="mt-4 flex-1 whitespace-pre-wrap font-body text-sm leading-relaxed text-brand-text">
{caption.text}
            </pre>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-2xl border border-brand-border bg-gradient-to-br from-brand-cyan/[0.06] via-brand-surface/30 to-brand-surface/30 p-8 text-center sm:p-10">
        <h3 className="font-heading text-2xl italic leading-tight text-brand-white sm:text-3xl">
          Get AI-powered captions and full social campaigns
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-dim sm:text-base">
          Social Perks writes captions tuned to your brand, schedules them
          across platforms, and runs full campaigns that turn customers into
          your marketing team.
        </p>
        <Link
          href="/ai"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan px-7 py-3 text-sm font-semibold text-brand-bg transition-all hover:bg-cyan-300 hover:shadow-lg hover:shadow-brand-cyan/20"
        >
          See how it works →
        </Link>
      </div>
    </div>
  );
}
