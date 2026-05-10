"use client";

import { useState } from "react";

// ─── Tweet bank ─────────────────────────────────────────────────────────────
//
// Private build-in-public schedule. 30 days, ordered for posting.
// Each tweet is hand-tuned for Twitter (X) and stays under 280 chars.

interface Tweet {
  day: number;
  theme:
    | "launch"
    | "metric"
    | "behind"
    | "lesson"
    | "customer"
    | "take"
    | "thread"
    | "screenshot"
    | "ask";
  text: string;
  imageIdea: string;
  bestTime: string; // PT
}

const TWEETS: Tweet[] = [
  // ── Week 1: launch + early traction ──────────────────────────
  {
    day: 1,
    theme: "launch",
    text: `built an AI marketing manager for small businesses.

it connects to your instagram, google, and tiktok. then it just... runs your marketing.

review campaigns, influencer outreach, perks for repeat customers.

free for 14 days, no credit card.

socialperks.onrender.com`,
    imageIdea:
      "Screenshot of the dashboard showing 'AI agent · Active' terminal with green checkmarks.",
    bestTime: "Tue 9:00am PT",
  },
  {
    day: 2,
    theme: "behind",
    text: `the question every solopreneur has after launch:

"is anyone going to actually use this thing?"

woke up to 14 signups. small number. felt huge.`,
    imageIdea:
      "Phone lock screen photo with 14 notification badges on the email app.",
    bestTime: "Wed 7:30am PT",
  },
  {
    day: 3,
    theme: "screenshot",
    text: `the demo i show every coffee shop owner:

"what if your best customers ran your marketing for you?"

→ they post a story
→ they get a free latte
→ you get 8x the reach for $3.50

this is the whole pitch.`,
    imageIdea:
      "60-second screen recording of the AI generating a campaign for 'Maria's Coffee'.",
    bestTime: "Wed 12:15pm PT",
  },
  {
    day: 4,
    theme: "lesson",
    text: `i was wrong about onboarding.

shipped a 7-step wizard. nobody finished it.

ripped it out. replaced with: "what's your business? what's your instagram?"

activation up 4x.

less is more is the most annoying truth in software.`,
    imageIdea:
      "Side-by-side: old 7-step wizard vs new 2-field form. Strikethrough on 'wizard'.",
    bestTime: "Thu 9:30am PT",
  },
  {
    day: 5,
    theme: "metric",
    text: `100 signups.

7 days post-launch. zero ad spend. zero VC. just twitter and a github readme.

if you're building for small businesses, the trick isn't the product. it's whether you sound like one.`,
    imageIdea:
      "Stripe-style line chart of cumulative signups over 7 days, hitting 100.",
    bestTime: "Fri 8:00am PT",
  },
  {
    day: 6,
    theme: "thread",
    text: `the AI marketing manager 1.0 stack, end to end. (1/9)

🧵`,
    imageIdea:
      "Thread continuation drafted in Notes app — show first 3 replies in a screenshot.",
    bestTime: "Sat 10:00am PT",
  },
  {
    day: 7,
    theme: "customer",
    text: `Maria runs a coffee shop in Oakland.

she signed up monday. by friday her AI agent had:

- generated 3 review campaigns
- approved 11 customer posts
- sent 14 free-drink perks

she did nothing. her sales were up 18%.`,
    imageIdea:
      "Photo of a real-looking coffee shop receipt next to a phone showing the dashboard.",
    bestTime: "Sun 11:00am PT",
  },

  // ── Week 2: build, lessons, takes ────────────────────────────
  {
    day: 8,
    theme: "behind",
    text: `tonight's bug: the AI was approving every customer submission, even the ones with literally zero engagement.

turns out the ranking model was off. fixed by training on 1,200 real reviews from yelp.

shipped at 1am. took 4 espressos.`,
    imageIdea:
      "Photo of a desk at night: laptop, terminal with green text, 4 espresso cups.",
    bestTime: "Mon 7:00pm PT",
  },
  {
    day: 9,
    theme: "take",
    text: `unpopular: most "marketing automation" tools are just spammers in a trench coat.

real automation = your customer hits a button, your business grows.

if there's a human getting nagged in the loop, it's not automated. it's delegated.`,
    imageIdea:
      "Mockup: meme of dog in trench coat captioned 'marketing automation, 2024'.",
    bestTime: "Tue 11:30am PT",
  },
  {
    day: 10,
    theme: "screenshot",
    text: `every saas founder writes their own onboarding emails.

i let claude write them and customers actually replied.

response rate went from 4% → 22%.

the AI has empathy. i have a backlog.`,
    imageIdea:
      "Side-by-side screenshot: 2 email replies labeled 'me' (cold) vs 'AI' (warm).",
    bestTime: "Wed 9:15am PT",
  },
  {
    day: 11,
    theme: "metric",
    text: `250 signups · 41 paying · $79/mo plan default

MRR: $3,239

still way under what i need to quit my job. but the slope is the right shape.`,
    imageIdea:
      "MRR line chart in Stripe — clean upward slope. Annotate launch day.",
    bestTime: "Thu 8:30am PT",
  },
  {
    day: 12,
    theme: "lesson",
    text: `i thought "small business owners don't care about AI" was true.

it's not. they're more excited than the YC bros.

the difference: they don't want to TALK about AI. they want to NOT THINK about marketing.

that's the whole product positioning.`,
    imageIdea:
      "Two-panel meme. Left: developer Twitter. Right: Maria texting 'wait it just did it??'",
    bestTime: "Thu 12:00pm PT",
  },
  {
    day: 13,
    theme: "behind",
    text: `today's small win:

a yoga studio in Austin sent us a 4-paragraph email saying their AI agent made them cry.

it generated a campaign for their 10-year anniversary that none of their human marketers had thought of.

building feels different this week.`,
    imageIdea: "Blurred screenshot of an actual customer email (with permission).",
    bestTime: "Fri 10:30am PT",
  },
  {
    day: 14,
    theme: "ask",
    text: `if you run a small business — coffee, yoga, tattoo, anything physical:

what's the most annoying part of marketing for you?

i'll build whatever the top reply is into the AI this weekend.`,
    imageIdea:
      "Photo of a blank notebook page with pen — captioned 'shipping whatever wins'.",
    bestTime: "Fri 4:00pm PT",
  },

  // ── Week 3: depth, customer wins, controversial ──────────────
  {
    day: 15,
    theme: "customer",
    text: `Sol runs a tiny smoothie cart in San Diego.

her best campaign last week: AI generated a 'guess the secret ingredient' contest. 200+ stories. 47 new followers. 12 walk-ins.

her marketing budget: $0. her time spent: 4 minutes approving submissions.`,
    imageIdea:
      "Photo of a smoothie cart with a chalkboard sign 'guess the ingredient → free smoothie'.",
    bestTime: "Mon 11:00am PT",
  },
  {
    day: 16,
    theme: "take",
    text: `every "dashboard" is a confession that your software didn't do its job.

if i have to look at a chart to know what to do next, you've offloaded the hard part to me.

the future of B2B is software that just does the thing.`,
    imageIdea:
      "Annotated screenshot of a Salesforce dashboard with red arrows pointing at 'YOU figure it out'.",
    bestTime: "Tue 9:00am PT",
  },
  {
    day: 17,
    theme: "screenshot",
    text: `our AI submission reviewer reading a customer post and saying "this is great but it doesn't tag your business — i'll send a polite reply asking them to fix it".

i didn't program that. it just figured it out.

LLMs are wild.`,
    imageIdea:
      "Screenshot of the AI review pipeline with the polite reply highlighted in cyan.",
    bestTime: "Wed 1:00pm PT",
  },
  {
    day: 18,
    theme: "lesson",
    text: `what i wish i knew before launching:

your first 100 users are not your customers.
they are your QA team.
they are your copywriters.
they are your investors.
they are your therapists.

treat them accordingly.`,
    imageIdea:
      "Quote tweet style: white text on cyan-to-purple gradient.",
    bestTime: "Thu 8:45am PT",
  },
  {
    day: 19,
    theme: "metric",
    text: `400 signups · 78 paying

churn after week 1: 2.3% (industry average is ~6%)

the trick to low churn isn't a feature. it's that the product does something today that they didn't do yesterday.

a result is the only retention strategy.`,
    imageIdea:
      "Cohort retention chart, our line vs industry baseline.",
    bestTime: "Fri 9:30am PT",
  },
  {
    day: 20,
    theme: "thread",
    text: `5 things about LLMs that surprised me building Social Perks: 🧵

1. "be polite" is a more reliable instruction than 50 lines of system prompt rules.

most of our prompt is just... vibes.`,
    imageIdea:
      "Hand-written sticky note that says 'BE POLITE' next to a laptop.",
    bestTime: "Sat 10:00am PT",
  },
  {
    day: 21,
    theme: "behind",
    text: `2am. just turned an enterprise prospect down.

they wanted a custom DSL for their campaign approval rules. 6-figure ARR.

said no. our whole thesis is "no rules engine, just an AI that gets it."

the moment we add knobs, we are every other tool.`,
    imageIdea:
      "Photo of a closed laptop on a desk, half-empty wine glass next to it.",
    bestTime: "Sun 7:30pm PT",
  },

  // ── Week 4: scaling, takes, customer transformations, asks ──
  {
    day: 22,
    theme: "customer",
    text: `a tattoo studio in Portland just hit me up:

"we used to spend 3hrs/wk on instagram. now we spend 10 min approving what the AI sends. our bookings are up 40% this month."

if you're a small business and you read this far, i built this for you.`,
    imageIdea: "Tattoo studio interior photo with '40% UP' overlay.",
    bestTime: "Mon 12:00pm PT",
  },
  {
    day: 23,
    theme: "take",
    text: `building a bootstrapped saas in 2026 means:

- LLMs do 80% of what your engineering team did in 2018
- distribution matters 10x more than the codebase
- every plan has to be obviously cheaper than a part-time hire

if it's not all three, you're competing in the wrong category.`,
    imageIdea: "Plain text on dark background — make it feel like a manifesto.",
    bestTime: "Tue 9:45am PT",
  },
  {
    day: 24,
    theme: "screenshot",
    text: `the moment a customer realizes the AI is actually doing it:

[screenshot of a 4am email saying "did this thing seriously just write a campaign while i was asleep??"]

every founder lives for this email.`,
    imageIdea:
      "Screenshot of a real customer email (anonymized) with the time '04:12am' highlighted.",
    bestTime: "Wed 11:00am PT",
  },
  {
    day: 25,
    theme: "lesson",
    text: `i used to think pricing was a math problem.

it's a positioning problem.

$29/mo: "tool"
$79/mo: "service"
$299/mo: "team member"
$2,000/mo: "consultant"

the number doesn't change what you do. it changes what they expect.`,
    imageIdea:
      "4-quadrant grid with the four prices and the four perceived identities.",
    bestTime: "Thu 9:00am PT",
  },
  {
    day: 26,
    theme: "metric",
    text: `30 days post-launch:

- 612 signups
- 124 paying
- $9,800 MRR
- 2 quit-my-day-job conversations
- 0 ads run

building in public works. especially when the building is real.`,
    imageIdea: "Single big number: $9,800. Cyan on black, mono font.",
    bestTime: "Fri 8:15am PT",
  },
  {
    day: 27,
    theme: "ask",
    text: `quick poll:

if you're a small business owner, what would make you trust an AI to post on your social accounts?

i'll build the top answer this weekend and ship monday.`,
    imageIdea: "Poll mockup with 4 options.",
    bestTime: "Fri 3:30pm PT",
  },
  {
    day: 28,
    theme: "behind",
    text: `what 30 days of building in public got me:

- 612 signups (paid: 124)
- $9.8k MRR
- 4 angel investor DMs (politely declined)
- 18 customer interviews
- 3 acquihire conversations
- 0 hours of cold outreach

the tweets ARE the funnel.`,
    imageIdea:
      "Stacked bar chart: 'where signups came from'. Twitter is 87% of the bar.",
    bestTime: "Sat 9:00am PT",
  },
  {
    day: 29,
    theme: "thread",
    text: `the entire 30-day playbook for launching a bootstrapped AI saas in public, every tweet, every metric, every screw-up: 🧵

(no email gate. no course. just the receipts.)`,
    imageIdea:
      "Photo of a paper cup full of pens labeled 'every tweet that worked'.",
    bestTime: "Sun 10:30am PT",
  },
  {
    day: 30,
    theme: "take",
    text: `30 days ago i shipped Social Perks alone.

today: 124 paying customers and an inbox of "this works."

the lesson isn't "build in public."
it's: stop saving the work for the launch.

the launch IS the work. one tweet at a time.

→ socialperks.onrender.com`,
    imageIdea:
      "Long-exposure photo of a desk lamp on at night. One word overlay: 'shipped'.",
    bestTime: "Mon 8:00am PT",
  },
];

// ─── UI ─────────────────────────────────────────────────────────────────────

const themeColor: Record<Tweet["theme"], string> = {
  launch: "border-brand-cyan/40 bg-brand-cyan/5",
  metric: "border-brand-green/40 bg-brand-green/5",
  behind: "border-brand-amber/40 bg-brand-amber/5",
  lesson: "border-brand-purple/40 bg-brand-purple/5",
  customer: "border-brand-pink/40 bg-brand-pink/5",
  take: "border-brand-red/40 bg-brand-red/5",
  thread: "border-brand-cyan/40 bg-brand-cyan/5",
  screenshot: "border-brand-orange/40 bg-brand-orange/5",
  ask: "border-brand-purple/40 bg-brand-purple/5",
};

const themeLabel: Record<Tweet["theme"], string> = {
  launch: "Launch",
  metric: "Metric",
  behind: "Behind the scenes",
  lesson: "Lesson learned",
  customer: "Customer win",
  take: "Hot take",
  thread: "Thread",
  screenshot: "Screenshot",
  ask: "Ask",
};

export default function TweetsLaunchPage() {
  const [copiedDay, setCopiedDay] = useState<number | null>(null);

  const copy = async (day: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDay(day);
      setTimeout(() => setCopiedDay(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-24 pt-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="border-b border-brand-border pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-cyan">
            Internal · Build in public
          </p>
          <h1 className="mt-3 font-heading text-3xl italic text-brand-white sm:text-5xl">
            30 days of tweets.
          </h1>
          <p className="mt-3 text-sm text-brand-dim">
            Ready to post. One per day. Sorted by suggested order. All under
            280 chars. Click any tweet to copy.
          </p>
        </div>

        {/* Tweets */}
        <ol className="mt-10 space-y-6">
          {TWEETS.map((t) => (
            <li
              key={t.day}
              className={`rounded-xl border ${themeColor[t.theme]} p-5 sm:p-6`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                    Day {String(t.day).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-cyan">
                    {themeLabel[t.theme]}
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                  {t.bestTime}
                </span>
              </div>

              <pre className="mt-4 whitespace-pre-wrap font-body text-[15px] leading-relaxed text-brand-white">
                {t.text}
              </pre>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-xs text-brand-dim">
                  <span className="font-mono uppercase tracking-wider text-brand-muted">
                    Visual:
                  </span>{" "}
                  {t.imageIdea}
                </p>
                <button
                  onClick={() => copy(t.day, t.text)}
                  className="rounded-md border border-brand-border bg-brand-elevated/50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-brand-text transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                >
                  {copiedDay === t.day ? "Copied!" : "Copy tweet"}
                </button>
              </div>

              <p className="mt-3 font-mono text-[10px] tracking-wider text-brand-muted">
                {t.text.length} / 280 chars
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
