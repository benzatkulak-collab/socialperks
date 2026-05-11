"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { Footer } from "@/components/shared/footer";

type Goal = "post" | "review" | "referral";

const GOAL_RANGES: Record<Goal, { label: string; min: number; max: number; mid: number }> = {
  post: { label: "Customer post", min: 0.05, max: 0.15, mid: 0.1 },
  review: { label: "Customer review", min: 0.02, max: 0.05, mid: 0.035 },
  referral: { label: "Customer referral", min: 0.1, max: 0.25, mid: 0.175 },
};

export default function PerkValueOptimizerPage() {
  const [aov, setAov] = useState<string>("");
  const [ltv, setLtv] = useState<string>("");
  const [goal, setGoal] = useState<Goal>("post");
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  const ltvNum = parseFloat(ltv) || 0;
  const aovNum = parseFloat(aov) || 0;
  const range = GOAL_RANGES[goal];
  const recommendedPerk = ltvNum * range.mid;
  const minPerk = ltvNum * range.min;
  const maxPerk = ltvNum * range.max;
  const roiMultiple = recommendedPerk > 0 ? (ltvNum - recommendedPerk) / recommendedPerk : 0;

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setShowResult(true);
    setCopied(false);
  }

  async function handleCopy() {
    const text = `Perk Value Optimizer Result
Average Order Value: $${aovNum.toFixed(2)}
Customer LTV: $${ltvNum.toFixed(2)}
Goal: ${range.label}
Recommended perk value: $${recommendedPerk.toFixed(2)} (${(range.mid * 100).toFixed(1)}% of LTV)
Range: $${minPerk.toFixed(2)} - $${maxPerk.toFixed(2)}
ROI multiple: ${roiMultiple.toFixed(2)}x
— socialperks.com/quiz/perk-value-optimizer`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <section className="mb-12">
          <h1 className="font-heading italic text-5xl mb-4">Perk Value Optimizer</h1>
          <p className="text-lg text-gray-300">
            How much should you spend per customer post, review, or referral?
          </p>
        </section>

        <form onSubmit={handleCalculate} className="space-y-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="aov">
              Average order value ($)
            </label>
            <input
              id="aov"
              type="number"
              min="0"
              step="0.01"
              required
              value={aov}
              onChange={(e) => setAov(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              placeholder="50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="ltv">
              Customer lifetime value ($)
            </label>
            <input
              id="ltv"
              type="number"
              min="0"
              step="0.01"
              required
              value={ltv}
              onChange={(e) => setLtv(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              placeholder="500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium mb-2">Goal</span>
            <div className="space-y-2">
              {(Object.keys(GOAL_RANGES) as Goal[]).map((g) => (
                <label key={g} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="goal"
                    value={g}
                    checked={goal === g}
                    onChange={() => setGoal(g)}
                    className="accent-cyan-500"
                  />
                  <span>{GOAL_RANGES[g].label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-medium py-3 rounded-lg transition"
          >
            Calculate
          </button>
        </form>

        {showResult && ltvNum > 0 && (
          <section className="mt-10 bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="font-heading italic text-3xl">Your recommendation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900/60 p-4 rounded-lg">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Recommended perk</div>
                <div className="text-3xl font-mono text-cyan-400">${recommendedPerk.toFixed(2)}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {(range.mid * 100).toFixed(1)}% of LTV
                </div>
              </div>
              <div className="bg-gray-900/60 p-4 rounded-lg">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Range</div>
                <div className="text-2xl font-mono text-green-400">
                  ${minPerk.toFixed(2)} – ${maxPerk.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {(range.min * 100).toFixed(0)}–{(range.max * 100).toFixed(0)}% of LTV
                </div>
              </div>
              <div className="bg-gray-900/60 p-4 rounded-lg">
                <div className="text-xs text-gray-400 uppercase tracking-wide">ROI multiple</div>
                <div className="text-3xl font-mono text-amber-400">{roiMultiple.toFixed(2)}x</div>
                <div className="text-xs text-gray-400 mt-1">net LTV / perk cost</div>
              </div>
              <div className="bg-gray-900/60 p-4 rounded-lg">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Goal</div>
                <div className="text-xl">{range.label}</div>
                <div className="text-xs text-gray-400 mt-1">AOV ${aovNum.toFixed(2)}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
            >
              {copied ? "Copied" : "Copy result"}
            </button>
          </section>
        )}

        <section className="mt-12 text-center">
          <Link
            href="/ai"
            className="inline-block bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-3 rounded-lg font-medium"
          >
            Run perk campaigns automatically with Social Perks →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
