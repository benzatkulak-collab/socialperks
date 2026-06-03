# Report D — What a World-Class Team Would Change First
*Premise: OpenAI, Stripe, Linear, Notion, and Shopify jointly inherit Social Perks on Monday. Each brings its culture to bear on the specific findings in this audit. This is a forcing function: each company's "first move" maps to a concrete, file-level change.*

---

## 🟦 Stripe — "Does the money path survive an outage, and would I trust it with mine?"
Stripe's culture is correctness, durability, and API craft. Their first reaction is visceral: **the perk wallet, programs, redemptions, and the financial ledger are in-memory.**

**First moves:**
1. **Halt charging until the value loop is durable.** Stripe would refuse to take a dollar for a product whose deliverable evaporates on cold start (`perk-wallet.ts:17`, `programs/store.ts:77`, `financial-ledger.ts:8`). The billing layer they'd *praise* (real `constructEvent`, raw-body verification, DB-backed idempotency) — then point out it's guarding a product that loses data.
2. **Make billing go-live boring and idempotent.** The false migration runbook (`setup-stripe-billing.sh` vs `migrate/route.ts`) would horrify them — a deploy artifact that lies about state. They'd make migrations automatic, idempotent, and verified by the readiness probe.
3. **Treat the ledger as sacred.** Double-entry bookkeeping in a `Map` is a contradiction; they'd persist it with reconciliation, or delete it until it's real.

**Stripe's one-liner:** *"Your billing code is better than your product is durable. Fix the thing you're selling before you sell it."*

---

## 🟩 Linear — "Why does this 0-user product carry a 10-year-old enterprise's codebase?"
Linear's religion is focus, speed, and ruthless scope discipline. They'd open the repo and see **two backends, ~104 routes, SOC2/sharding/multi-tenant/exchange for nobody** — and reach for the delete key.

**First moves:**
1. **Delete ~40% of the code in week one** (`api/`, `infrastructure/*`, exchange, dead engines, API v2, `ideas.ts`). Linear ships fast precisely because there's nothing dead to wade through.
2. **Collapse to one core loop.** Campaigns vs Programs vs Exchange is three products pretending to be one; Linear picks the campaign loop and cuts the rest the same day.
3. **No versioning, no plugins, no abstractions before users.** API v2 deprecating v1 that the frontend still uses (`versioning.ts`) is exactly the process-theater Linear avoids. Event-sourcing for one FTC call → a function.

**Linear's one-liner:** *"You've built the maintenance burden of a 200-person company with the user base of zero. Subtract until it's fast."*

---

## 🟪 OpenAI — "Is the 'AI' real, and is it honest?"
OpenAI would immediately clock that **there is no model anywhere** — and that the product *charges* for "AI" and shows *fabricated* projections.

**First moves:**
1. **Stop AI-washing today.** Either wire a real model or rename it. Metering template-fill as "AI" (`_enforce-ai-limit.ts` → `ai-engine.ts:233`) and printing invented "Expected ROI: Nx" (`agent.ts:60`) is the kind of thing that ends up in a screenshot on the internet.
2. **Put a real LLM exactly where it earns trust:** campaign strategy/copy generation, on top of the existing rules engine as scaffolding — low risk, high perceived value, makes the brand promise true. Add caching + logging + guardrails (prompt-cache and structured output are cheap wins).
3. **Replace verification theater with a real signal.** `verification-engine.ts:144` returning 0.95 confidence with no API call is the opposite of evals-driven culture; they'd ground it in OAuth/webhooks and *measure* precision/recall, and treat the circular fraud "ML" (`fraud-training.ts:102`) as a rules baseline, not a model.

**OpenAI's one-liner:** *"Make the AI real where it matters, label it honestly everywhere else, and never show a number you made up."*

---

## ⬛ Notion — "Can a non-technical owner understand and trust this in 60 seconds?"
Notion obsesses over clarity, mental models, and craft. They'd love the onboarding wizard and claim page — then despair at the **incoherent surface**: a mom-and-pop owner facing campaigns + programs + wallet + exchange + referrals + "AI agent" + MCP, with a **dead "Get Started" button** and a **reset link to nowhere**.

**First moves:**
1. **One clear object model, one nav.** Decide what a "perk," a "campaign," and a "reward" are, and never show the user the other vocabularies. Kill the duplicate landing pages (`app/page.tsx` vs `components/app.tsx`).
2. **Finish the unglamorous flows.** Reset, email verification, mobile admin, real toasts instead of `confirm()` — the "boring" 20% that defines whether the product feels trustworthy.
3. **Accessibility as craft, not compliance.** Fix the contrast tokens (`globals.css:132`) and focus traps — Notion treats this as table-stakes polish, not a checkbox.

**Notion's one-liner:** *"The wizard is delightful and then the product forgets to be a product. Make the whole thing as considered as the first screen."*

---

## 🟧 Shopify — "Where do the first 1,000 real merchants come from, and what do they plug into?"
Shopify thinks in merchant outcomes and ecosystems. They'd see a platform with **no integrations**, an **influencer side that earns nothing**, and a **referral loop the company doesn't even dogfood** (and that loses codes on deploy).

**First moves:**
1. **Pick a wedge and integrate into it.** A Shopify app (or Square/POS for local SMBs) so a merchant connects their store and auto-issues perks — distribution + activation in one move. Standalone tools don't scale; ecosystem plugs do.
2. **Dogfood the growth loop.** The product *is* a referral/UGC engine — make the referral program durable, two-sided, and front-and-center (`referrals/index.ts:33`). A growth product that doesn't use its own mechanism is a tell.
3. **Outcome-aligned pricing.** Shopify aligns price to merchant success. They'd add a usage/commission option (a % of redeemed-perk value) to blunt Stack Influence's "no SaaS fee, pay-per-post" threat, plus a mid-market tier and a trial.

**Shopify's one-liner:** *"Merchants don't buy platforms, they buy outcomes that plug into what they already run. Integrate, dogfood your own loop, and price to their wins."*

---

## The synthesis: what they'd all agree on, in order
If these five teams had to agree on a single prioritized list, it would be almost exactly Arc 1 of the 90-day plan:

1. **Stripe:** make the value loop durable before charging. *(durability)*
2. **Linear:** delete 40% of the repo and collapse to one loop. *(focus)*
3. **OpenAI:** stop AI-washing; make AI real where it earns trust. *(truth)*
4. **Notion:** finish the funnel and the boring flows; one clear model. *(clarity)*
5. **Shopify:** integrate into a wedge and dogfood the referral loop. *(distribution)*

**The unifying insight:** none of them would *build* much at first. They'd **subtract, persist, and tell the truth** — because the product underneath is real and capable, just buried. The fastest path to elite is to stop pretending to be enterprise and start being an excellent, honest, durable SMB product.
