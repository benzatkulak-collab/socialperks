# Conversion Optimization Plan (Phase 9)

*Every step: current friction → drop-off risk → missing incentive → fix (effort). Drop-off estimates are illustrative, benchmarked to SMB-SaaS norms. Ground truth: `funnel-walkthrough.md`, `monetization-reality.md`, `growth-surface.md`.*

## 0. The activation metric & aha-moment

- **Activation metric:** *first real customer claim within 7 days of signup* (a QR scan + submitted post on a live campaign). Not "campaign launched" — that's a synthetic value moment the product currently celebrates but can't pay off.
- **Aha-moment:** the owner watches a real customer post about them → redeem a perk at their own counter. This is the moment that creates retention and word-of-mouth. **It is unreachable in shipped code today** (the 5 loop breaks) — which is why activation is the #1 priority of the whole reinvention.
- **North-star:** verified customer posts per active business per week.

## 1. The funnel, step by step

| Step | Current friction (verified) | Est. drop-off | Missing incentive | Fix (effort) |
|---|---|---|---|---|
| **Visitor → landing** | Fabricated "Real numbers" social proof + "Maria's Coffee Shop" example (0 real users); dev/MCP strip mid-page confuses SMB; "works for any business" clashes with coffee-shop waitlist | — (trust leak) | A *believable* reason this works for *them* | Replace fabricated proof with honest "founding 10 businesses" framing; move dev strip to /developers; pick the vertical wedge (S) |
| **Landing → signup start** | Primary hero CTA `#signup` lands on the **LOGIN** screen ("Welcome back"); user must find tiny "Sign up free" | **20–35%** lost here | — | Default to signup on `#signup` (S, trivial) |
| **Signup start → complete** | Role picker (business/creator) adds a decision gate; "creator" leads to the dead influencer portal; demo accounts + "PIN 1234" advertised → "toy" signal | 15–25% | Reassurance, momentum | Drop the creator path (cut influencer); remove demo/PIN from prod; 4-field form is otherwise good (S) |
| **Signup → first campaign (wizard)** | **Strongest step** — 3-screen auto-launching wizard, ~60–90s, good defaults, confetti | <10% (good) | — | Keep. This is the model for the rest of the product. |
| **Campaign live → customer sees it** | **BROKEN: no QR-poster button.** Onboarding *tells* owner to print a poster; UI gives no way. Only sharing = an unlabeled icon that copies a link | **~60–80%** (activation cliff) | A one-tap way to get the campaign in front of customers | Poster button + share + "text a customer" on the wizard success screen (S, API exists) |
| **Customer claim page** | Good page, but the ask is huge vs reward: leave the page, make an IG story, find its URL (stories have none), come back, paste it | **~50–70%** of customers | Lower-effort proof, instant gratification | File/screenshot **upload** (no upload exists today); platform deep-links; show the perk preview prominently (M) |
| **Proof submission** | **404s on cold lambda** (public route doesn't rehydrate); customer does the work, submit errors | **catastrophic, intermittent** | Reliability | Add DB-fallback rehydrate to the public submit route (S) |
| **Business review** | **No business review UI** — approve/reject only in unreachable /admin; only signal is a transient SSE toast | **~100% stall** | A queue/badge/email the owner actually sees | Build a business-facing review surface + email/badge on new submission (M) |
| **Perk award** | Approve awards **no perk, no email** (admin omits required fields) | **~100%** | The customer actually getting their reward | Fix approve→award→email path; send the perk to the customer's phone (M) |
| **Redemption** | Anonymous customer has **no surface to see/redeem** a perk (wallet requires auth) | **~100%** | "Show this code at the register" | Public magic-link perk wallet + staff verification screen (M) |
| **Repeat usage (day 2/7)** | **Dashboard amnesia** — returning owner sees 0 campaigns/0 stats (in-memory reads reset on deploy); nothing accumulates anyway | **near-total day-2 churn** | A reason to come back | Call existing `loadLifecyclesForBusiness`; weekly results email once loop closes (S+M) |
| **Referral** | Signup never reads `sp-ref` cookie → conversions structurally 0; truncation bug | 100% of referral yield lost | Working attribution + visible reward | 20-line cookie-read fix; one referral system (S) |
| **Paid conversion** | Checkout 503s (env unset); no billing link in nav; "why pay" doesn't exist (quota-only gate); paying users mis-enforced as free after cold start | **~100%** today | An honest, reachable reason and door to pay | Go-live env; billing in nav; re-tier around real value; hydrate subs in enforcement (S+M) |

## 2. The optimized funnel end-state (target rates vs SMB-SaaS norms)

| Step | Target conversion | SMB-SaaS benchmark | Lever |
|---|---|---|---|
| Visitor → signup start | 8–12% | 2–5% typical; higher with sharp wedge + local intent | honest proof, fixed CTA, vertical landing pages |
| Signup start → complete | 70–80% | 60–75% | 4-field form, no role gate |
| Signup → campaign launched | 80%+ | — | the wizard (already excellent) |
| Campaign → first customer claim (7d) | **40–55%** ← activation | n/a (new metric) | poster button + share + low-effort proof |
| Activation → week-4 retained | 55–70% | — | closed loop + weekly results + streaks |
| Retained → paid | 8–15% | 2–10% freemium SMB | real "why pay," value-moment upgrade prompts |

## 3. Instrumentation plan (exact PostHog events to add)

Today only 5 acquisition events fire; the **entire value loop is analytically dark** (`growth §5`). Add **server-side** capture (no posthog-node today) for:
`campaign_launched`, `poster_printed`, `claim_page_viewed` (named), `proof_submitted`, `submission_reviewed`, `perk_awarded`, `perk_redeemed`, `referral_attributed`, `weekly_results_opened`. Fire `perk_redeemed` from the server (Stripe-webhook-style source of truth), not the browser. This makes activation, retention, and the loop's true conversion measurable for the first time.

## 4. The paid-conversion trigger design (when/how to ask for money)

- **Don't ask at signup** (the current pricing-intent path 503s anyway). Ask at the **value moment**: after a business gets its **first 10 verified customer posts** or hits the free verified-claim cap — "Your customers posted 12 times this week. Core ($39) unlocks unlimited + Square redemption tracking."
- Add **success-based** prompts (none exist today — all current triggers are scarcity-based): celebrate the result, then upsell the amplification.
- Make the **door reachable**: billing link in nav; one-click upgrade that uses `subscription_update` (not a 2nd subscription).
- **Never** show a paying customer an upgrade modal for the plan they bought — fix the cold-start mis-enforcement first (`monetization §4`).

> **Net:** the funnel is a beautifully built ramp into a void — world-class until "campaign live," then five breaks and a missing button. Fixing the activation cliff (poster button + closed loop + low-effort proof) and the paid-conversion reachability (env + nav + real "why pay") is worth more than any new feature, because every visitor the front of the funnel already converts is currently lost at the back.
