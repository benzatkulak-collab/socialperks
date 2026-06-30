# Social Perks — 21-Day Paid-Pilot Demand Test

**Single objective:** prove (or disprove) that real local businesses will *pay* and *activate*, before building anything else.
**Target:** **5 paying logos in 14 days of selling**, with ≥3 reaching first value (a real customer claim) within 7 days of signup.
**Constraint:** 100% virtual / internet-native acquisition. No in-person, no trade shows, no door-knocking.
**Honesty rule:** every claim must match the product as shipped (see the honesty fixes in commits `c20e366`, `3ebc4dc`). No fabricated metrics, no "AI," no "automatic verification." We sell "you approve in one click."

This file is the executable form of Steps 3–5 of the profitability roadmap. Steps 1–2 (durability, activation telemetry, honest copy) are already shipped.

---

## STEP 3 — Build the offer and the list (Days 4–7)

### 3.1 The vertical: independent coffee shops
Why this one (pick ONE, resist the urge to broaden):
- Consumer-facing, Instagram-native, high visit frequency → the perk-for-post loop fits naturally.
- Low-consideration purchase → owner can say yes without a committee.
- Dense, easy to find online, and they already follow each other (referral surface).
- The product already has coffee-shop templates and the landing page commits to "onboarding the first 10 coffee shops by hand."

If coffee shops give a hard no after ~80 quality touches, the fallback verticals in priority order: **boutique fitness/yoga studios → nail/hair salons → taquerias/casual restaurants.** Switch the vertical, keep everything else.

### 3.2 The offer (designed to produce a real willingness-to-pay signal)
- **"Founder pilot" — first 10 coffee shops only.** I personally set up your first campaign and QR poster, and you run it for 90 days.
- **Real card, real price:** Starter **$10/mo** (or Pro $25/mo if they want API/recommendations). The card on file is the point — a free pilot proves nothing about willingness to pay.
- **De-risked:** 30-day money-back guarantee (already in product copy), cancel anytime in two clicks.
- **The hook (honest):** "Turn the customers already posting about you into a steady stream of tagged posts — with the #ad disclosure baked in so you stay FTC-compliant. You approve each post in one click before any discount goes out."
- **What you are NOT promising:** specific ROI numbers, automatic AI verification, or results from other customers (you have none yet — saying so is fine and even builds trust).

### 3.3 Build the list (repeatable, virtual)
Goal: **100–200 qualified prospects** to land 5 paying (assume ~3–5% cold-to-paid).
Method (≈2–3 hours):
1. Google Maps → search "independent coffee shop" in 8–12 mid-size metros (Austin, Portland, Nashville, Asheville, etc.). Skip chains.
2. For each: capture **business name, city, Instagram handle, website, owner email** (from site/footer/link-in-bio). Prioritize shops that already post to Instagram (proves they value social) but have <5k followers (they need help scaling it).
3. Log into the tracker (see §4.3). Tag each prospect with their best channel (IG DM if active on IG, else email).

Tooling: do it manually for the first 100 (you'll learn the ICP). Don't build scrapers yet — that's premature optimization.

### 3.4 Outreach assets (copy-paste, then personalize the first line)

**Instagram / TikTok DM (primary — they live here):**
> Hey [name]! Your [specific drink/photo] posts are great — looks like customers love tagging you. I built a tool that turns those tags into a steady stream: customers post about you, you approve it in one click, they get a small perk (free pastry, 10% off). #ad disclosure is baked in so you stay compliant. I'm setting up the first 10 coffee shops myself, free setup. Want me to build your first campaign so you can see it? (takes ~10 min)

**Cold email (subject: "turning your taggers into regulars — [shop name]"):**
> Hi [name],
> I noticed [shop] gets tagged a lot on Instagram — that's free marketing most shops never systematize.
> Social Perks turns it into a repeatable loop: a QR poster at your counter → customer posts with the right #ad disclosure → you approve it in one click → they get a small perk → their post brings the next customer.
> I'm personally onboarding the first 10 coffee shops. I'll build your first campaign and QR poster for you — you'd just need ~10 minutes. $10/mo, 30-day money-back, cancel anytime.
> Worth a quick look? I can have your campaign live today.
> — [you], founder, Social Perks (socialperks.app)

**Community post (Reddit r/cafe, r/barista, coffee-owner FB groups, Indie Hackers — read each group's self-promo rules first):**
> I built a tool for coffee shops that turns customer Instagram tags into a repeatable perk-for-post loop (with the FTC #ad disclosure handled, since Google/Yelp ban incentivized reviews but social posts are fine with disclosure). Looking for 10 shops to onboard by hand for free and learn what actually helps. Not trying to spam — happy to just show it. Comment or DM if you want in.

**Follow-up (48h after no reply, once):**
> No worries if it's not a fit — last nudge: I'll build the whole first campaign + poster for you so there's nothing to figure out. Want me to just send you a preview for [shop]?

Cadence: DM/email → 48h follow-up → done. Two touches max per prospect. Move on; volume is the lever.

---

## STEP 4 — Sell and onboard (Days 7–21)

### 4.1 The path from "yes" to first value
The activation funnel is now instrumented end-to-end (PostHog events shipped in commit `c20e366`):
`signup_completed → campaign_launched → submission_created → submission_reviewed → perk_redeemed`

Founder-onboarding script (target: campaign live same day, first customer claim within 7 days):
1. **Yes → 10-min screenshare (or async Loom).** Don't make them self-serve the first time.
2. **Create account together** at socialperks.app (`signup_completed` fires).
3. **Launch their first campaign with them** — pick a coffee-shop template (Instagram story tag → free pastry is the proven starter). `campaign_launched` fires. This is the moment the funnel used to go dark — now you'll see it.
4. **Print the QR poster** for their counter (the poster button/route exists).
5. **Seed the first post:** ask them to get ONE regular to post + submit while you're on the call → you approve it in one click (`submission_created` → `submission_reviewed`). They see the loop work once. That's the aha.
6. **Set the 7-day goal:** "Let's get your first real customer claim this week." Check in day 3 and day 7.

### 4.2 Objection handling (honest answers only)
- *"Do you have other coffee shops using it?"* → "You'd be one of my first 10 — that's why I'm setting it up personally and the price is $10. I'm being upfront: no case studies yet, which is exactly why I want you in early."
- *"Can I just pay for Google reviews?"* → "No — Google/Yelp ban incentivized reviews and can suspend you. We do Instagram/TikTok/Facebook posts with the #ad disclosure, which is allowed. That's the whole compliance angle."
- *"Is the verification automatic?"* → "We check the link is live and on the right platform and flag anything odd, then you approve in one click. Not a black box — you're always in control." (Matches shipped reality.)
- *"What if it doesn't work?"* → "30-day money-back. If your customers aren't posting in the first month, email me and I refund it."

### 4.3 Pilot tracker (create as a sheet; columns)
| shop | city | channel | first_touch | replied | call_booked | signed_up | card_on_file | campaign_launched | first_submission | first_approval | first_redemption | MRR | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Cross-check the `campaign_launched` / `submission_created` / `perk_redeemed` columns against PostHog — the funnel and the sheet should agree. If PostHog shows 0 `campaign_launched` while shops "signed up," activation is broken, not demand.

---

## STEP 5 — Decide (Day 21)

Read the numbers, not your feelings. Two metrics decide everything:
- **Willingness to pay:** # of cards on file (paid signups).
- **Activation:** # reaching `perk_redeemed` (or at least `submission_reviewed`) within 7 days.

### Decision gate
- **≥5 paid AND ≥3 activated → POUR FUEL.** Demand is real. Next: turn on the free loops (referral reward + claim-page indexing, roadmap #6), wire the weekly results digest (#7), and scale the single channel that produced the most paid logos. Then — and only then — test the higher price anchor (#8, ~$39/$99) against the now-live funnel.
- **2–4 paid → SIGNAL, NOT PROOF.** Something resonates but the offer/channel/vertical is off. Interview every yes AND every no, change the ONE weakest variable (usually channel or vertical), re-run a 14-day sprint. Do not build features.
- **0–1 paid → PIVOT THE WEDGE.** The vertical or the core value prop is wrong. Interview the no's for the real objection. Switch vertical (§3.1 fallback order) or reposition before re-running. Still do not build features.

### What this test explicitly forbids
While the demand test runs, do **not**: build staff-confirmed redemption, real Graph-API verification, the network-effect/cross-business feature, the influencer or enterprise surfaces, or reprice. All of that is fuel for an engine you haven't yet proven runs. The audit's #1 constraint is unvalidated demand — this test is the only thing that removes it.

---

## Why this is the plan (one line)
The product is now durable, observable, and honest (Steps 1–2). The only thing between here and profitability is proof that someone pays and stays. This test buys that proof for <$200 and 3 weeks — cheaper than one more feature, and it tells you which feature to build next.
