"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

type Archetype = "friend" | "expert" | "rebel" | "caretaker" | "cool";

const ARCHETYPES: Record<
  Archetype,
  {
    name: string;
    tagline: string;
    wordsToUse: string[];
    wordsToAvoid: string[];
    samplePosts: string[];
  }
> = {
  friend: {
    name: "The Friend",
    tagline: "Warm, casual, and approachable — like your favorite neighbor.",
    wordsToUse: ["hey", "friend", "love", "obsessed", "real talk", "you", "we", "yes", "honestly", "promise"],
    wordsToAvoid: ["leverage", "synergy", "utilize", "stakeholder", "procure", "endeavor", "henceforth", "hereby", "kindly", "esteemed"],
    samplePosts: [
      "Hey friends — we restocked your favorite lavender soap. Come grab one before it disappears again.",
      "Real talk: Tuesdays are slow around here and we miss you. Pop in for a free cookie with any drink today.",
    ],
  },
  expert: {
    name: "The Expert",
    tagline: "Authoritative, precise, and credible — the source people trust.",
    wordsToUse: ["research", "data", "proven", "method", "evidence", "results", "expertise", "certified", "analysis", "process"],
    wordsToAvoid: ["amazing", "vibes", "literally", "obsessed", "girlie", "slay", "lowkey", "bestie", "lol", "totally"],
    samplePosts: [
      "Our extraction method preserves 38% more antioxidants than standard processes. The result: a cleaner cup, every time.",
      "After three years of testing, we've refined a 7-step framework that delivers consistent outcomes for every client.",
    ],
  },
  rebel: {
    name: "The Rebel",
    tagline: "Bold, provocative, and unafraid to call things out.",
    wordsToUse: ["unfiltered", "honest", "break", "rules", "different", "raw", "real", "no", "stop", "bold"],
    wordsToAvoid: ["delighted", "kindly", "humbly", "graciously", "lovely", "sweet", "darling", "cute", "precious", "adorable"],
    samplePosts: [
      "Everyone else is selling you the same recycled formula. We made the version they don't want you to see.",
      "Stop apologizing for taking up space. Walk in. Order loud. Tip well. We're here for it.",
    ],
  },
  caretaker: {
    name: "The Caretaker",
    tagline: "Nurturing, sincere, and protective of the people you serve.",
    wordsToUse: ["care", "gentle", "support", "comfort", "safe", "home", "nourish", "tender", "grateful", "warmth"],
    wordsToAvoid: ["dominate", "crush", "destroy", "savage", "ruthless", "killer", "weapon", "hustle", "grind", "war"],
    samplePosts: [
      "We added a quiet corner in the back, with soft lighting and herbal tea. For the days you need somewhere gentle.",
      "Thank you for trusting us with your skin, your stories, your time. We don't take any of it for granted.",
    ],
  },
  cool: {
    name: "The Cool One",
    tagline: "Effortless, understated, and quietly confident.",
    wordsToUse: ["minimal", "just", "simple", "clean", "quiet", "essentials", "considered", "made", "by hand", "soon"],
    wordsToAvoid: ["incredible", "unbelievable", "earth-shattering", "mind-blowing", "epic", "insane", "legendary", "wild", "crazy", "huge"],
    samplePosts: [
      "New drop. Three pieces. Limited run.",
      "Open today. Same as always. See you when you're here.",
    ],
  },
};

type Question = {
  prompt: string;
  options: { letter: string; text: string; archetype: Archetype }[];
};

const QUESTIONS: Question[] = [
  {
    prompt: "Pick the sentence that sounds most like you:",
    options: [
      { letter: "A", text: "Hey friend, so excited you stopped by", archetype: "friend" },
      { letter: "B", text: "Our research indicates...", archetype: "expert" },
      { letter: "C", text: "We don't play by the rules", archetype: "rebel" },
      { letter: "D", text: "Take care of yourself today", archetype: "caretaker" },
      { letter: "E", text: "Drop by sometime.", archetype: "cool" },
    ],
  },
  {
    prompt: "Your favorite emoji in business posts:",
    options: [
      { letter: "A", text: "❤️", archetype: "friend" },
      { letter: "B", text: "📊", archetype: "expert" },
      { letter: "C", text: "🔥", archetype: "rebel" },
      { letter: "D", text: "🌿", archetype: "caretaker" },
      { letter: "E", text: "✨ or none", archetype: "cool" },
    ],
  },
  {
    prompt: "Customer complaint — your response:",
    options: [
      { letter: "A", text: "So sorry babe, let's make this right immediately.", archetype: "friend" },
      { letter: "B", text: "Per our policy, here's what we can offer.", archetype: "expert" },
      { letter: "C", text: "Honestly, you might be right — let's talk.", archetype: "rebel" },
      { letter: "D", text: "We care deeply and want to fix this for you.", archetype: "caretaker" },
      { letter: "E", text: "That's interesting feedback. Thanks.", archetype: "cool" },
    ],
  },
  {
    prompt: "Your favorite type of social post:",
    options: [
      { letter: "A", text: "Behind the scenes", archetype: "friend" },
      { letter: "B", text: "Educational", archetype: "expert" },
      { letter: "C", text: "Hot take", archetype: "rebel" },
      { letter: "D", text: "Customer story", archetype: "caretaker" },
      { letter: "E", text: "Mood / aesthetic", archetype: "cool" },
    ],
  },
  {
    prompt: "How formal is your business?",
    options: [
      { letter: "A", text: "Casual", archetype: "friend" },
      { letter: "B", text: "Professional", archetype: "expert" },
      { letter: "C", text: "Anti-establishment", archetype: "rebel" },
      { letter: "D", text: "Heartfelt", archetype: "caretaker" },
      { letter: "E", text: "Effortless", archetype: "cool" },
    ],
  },
  {
    prompt: "How do you sign off a customer email?",
    options: [
      { letter: "A", text: "xoxo", archetype: "friend" },
      { letter: "B", text: "Regards", archetype: "expert" },
      { letter: "C", text: "Stay loud", archetype: "rebel" },
      { letter: "D", text: "With love", archetype: "caretaker" },
      { letter: "E", text: "— [name]", archetype: "cool" },
    ],
  },
  {
    prompt: "Pick a soundtrack for your business:",
    options: [
      { letter: "A", text: "Top 40 feel-good pop", archetype: "friend" },
      { letter: "B", text: "Classical or instrumental", archetype: "expert" },
      { letter: "C", text: "Punk / hip hop", archetype: "rebel" },
      { letter: "D", text: "Acoustic / folk", archetype: "caretaker" },
      { letter: "E", text: "Lo-fi or ambient", archetype: "cool" },
    ],
  },
  {
    prompt: "Your dream collaborator:",
    options: [
      { letter: "A", text: "A funny mom influencer with 50K followers", archetype: "friend" },
      { letter: "B", text: "A respected industry analyst or professor", archetype: "expert" },
      { letter: "C", text: "An anti-establishment artist with a cult fanbase", archetype: "rebel" },
      { letter: "D", text: "A community organizer or wellness leader", archetype: "caretaker" },
      { letter: "E", text: "A quiet creative director everyone whispers about", archetype: "cool" },
    ],
  },
  {
    prompt: "Your storefront vibe:",
    options: [
      { letter: "A", text: "Bright, colorful, lots of hellos at the door", archetype: "friend" },
      { letter: "B", text: "Clean, structured, well-labeled", archetype: "expert" },
      { letter: "C", text: "Bold posters, loud paint, no apologies", archetype: "rebel" },
      { letter: "D", text: "Plants, candles, gentle lighting", archetype: "caretaker" },
      { letter: "E", text: "Sparse, considered, no signage", archetype: "cool" },
    ],
  },
  {
    prompt: "How do you announce a new product?",
    options: [
      { letter: "A", text: "OMG you guys, this is going to be your new favorite", archetype: "friend" },
      { letter: "B", text: "Introducing our most rigorously tested formula yet", archetype: "expert" },
      { letter: "C", text: "We made the thing nobody else dared to make", archetype: "rebel" },
      { letter: "D", text: "A new way to take care of yourself, with love", archetype: "caretaker" },
      { letter: "E", text: "New. Out now.", archetype: "cool" },
    ],
  },
];

export default function BrandVoiceQuizPage() {
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<Archetype, number>>({
    friend: 0,
    expert: 0,
    rebel: 0,
    caretaker: 0,
    cool: 0,
  });
  const [done, setDone] = useState(false);

  function pick(archetype: Archetype) {
    const next = { ...counts, [archetype]: counts[archetype] + 1 };
    setCounts(next);
    if (step + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  }

  function restart() {
    setStep(0);
    setCounts({ friend: 0, expert: 0, rebel: 0, caretaker: 0, cool: 0 });
    setDone(false);
  }

  const winner = (Object.keys(counts) as Archetype[]).reduce((best, k) =>
    counts[k] > counts[best] ? k : best,
  "friend");

  async function handleShare() {
    const archetype = ARCHETYPES[winner];
    const text = `I'm ${archetype.name} — ${archetype.tagline}\n\nFind your brand voice: socialperks.com/quiz/brand-voice`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My brand voice", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-heading italic text-5xl mb-2">Brand Voice Quiz</h1>
        <p className="text-lg text-gray-300 mb-10">
          10 questions to discover the voice your business should use everywhere.
        </p>

        {!done && (
          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-3">
              Question {step + 1} of {QUESTIONS.length}
            </div>
            <h2 className="text-2xl font-medium mb-6">{QUESTIONS[step].prompt}</h2>
            <div className="space-y-3">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.letter}
                  type="button"
                  onClick={() => pick(opt.archetype)}
                  className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded-lg px-4 py-3 transition"
                >
                  <span className="font-mono text-cyan-400 mr-3">{opt.letter}</span>
                  {opt.text}
                </button>
              ))}
            </div>
            <div className="mt-6 h-2 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{ width: `${((step) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </section>
        )}

        {done && (
          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 space-y-6">
            <div className="text-xs uppercase tracking-wide text-gray-400">Your brand voice</div>
            <h2 className="font-heading italic text-5xl">{ARCHETYPES[winner].name}</h2>
            <p className="text-lg text-gray-300">{ARCHETYPES[winner].tagline}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm uppercase tracking-wide text-green-400 mb-2">Words to use</h3>
                <ul className="flex flex-wrap gap-2">
                  {ARCHETYPES[winner].wordsToUse.map((w) => (
                    <li key={w} className="bg-green-500/10 text-green-300 px-2 py-1 rounded text-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-wide text-amber-400 mb-2">Words to avoid</h3>
                <ul className="flex flex-wrap gap-2">
                  {ARCHETYPES[winner].wordsToAvoid.map((w) => (
                    <li key={w} className="bg-amber-500/10 text-amber-300 px-2 py-1 rounded text-sm">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Sample posts</h3>
              <div className="space-y-3">
                {ARCHETYPES[winner].samplePosts.map((post, i) => (
                  <div key={i} className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 text-gray-200">
                    {post}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="button"
                onClick={handleShare}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
              >
                Share my result
              </button>
              <button
                type="button"
                onClick={restart}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
              >
                Retake quiz
              </button>
            </div>

            <Link
              href="/ai"
              className="inline-block mt-4 bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-3 rounded-lg font-medium"
            >
              Have AI write social posts in your brand voice — Social Perks free trial →
            </Link>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
