# /try — Demand-Test Ad Copy (2026-07-04)

All variants drive to **socialperks.app/try** (the noindexed $79-trial landing page). Goal = measure **click → trial-start** (willingness-to-pay signal). Lead with the **compliance** angle — it's the real differentiator and the thing owners are nervous about. Keep spend tiny ($5–20/day per channel) — this is a signal test, not a launch.

> ⚠️ Truth-in-advertising: only run claims we can back. "$500/mo tools" refers to Podium/Birdeye (third-party estimates). Don't claim customer counts or results we don't have yet.

---

## 1. Meta / Instagram ads (best paid channel for local SMB)
Target: page admins / small-business owners, interests = coffee shop / salon / restaurant ownership, local radius. Creative = a clean shot of a barista/customer or a phone showing a tagged post.

**Variant A — compliance hook (lead)**
- **Primary text:** Want customers posting about your shop on Instagram — without getting tangled in FTC rules? Offer a small perk, they post, and we add the required disclosure automatically. Real word-of-mouth, not ads.
- **Headline:** Turn regulars into promoters
- **Description:** $79/mo · 14-day free trial
- **CTA button:** Start free trial

**Variant B — price anchor**
- **Primary text:** The big review tools cost $500+/mo and are built for chains. Social Perks does the part a coffee shop actually needs — customers posting about you, compliantly — for $79/mo. First post can go live this week.
- **Headline:** What Podium does, for a coffee shop price
- **CTA button:** Learn more

**Variant C — pain-first**
- **Primary text:** Your best customers would happily post about you… they just never do. Give them a reason (a free drink), and let us handle the FTC disclosure + tracking. 14-day free trial.
- **Headline:** Get customers to post — the legal way
- **CTA button:** Start free trial

---

## 2. Google Search ads
Keywords (exact/phrase, low budget): `get more customer posts`, `ugc for small business`, `how to get customers to post on instagram`, `birdeye alternative`, `podium alternative for small business`, `customer review software for cafes`.

**Ad 1**
- **H1:** Get Customers Posting About You
- **H2:** FTC-Compliant, $79/mo
- **H3:** 14-Day Free Trial
- **Desc:** Offer a perk, customers post on Instagram & TikTok — we add the required disclosure automatically. Cancel anytime.

**Ad 2 (competitor)**
- **H1:** A Simpler Podium Alternative
- **H2:** Built for Local Shops
- **H3:** From $29/mo
- **Desc:** Skip the $500/mo enterprise suite. Turn your regulars into Instagram & TikTok posts — compliantly. Free trial.

---

## 3. Reddit
r/smallbusiness bans vendor spam → the **organic WTP post** in `demand-research-2026-07-04.md` is the primary test there (no link, just the pricing question). If running **Reddit Ads** (allowed, targeted to r/smallbusiness, r/Entrepreneur):
- **Headline:** Get customers posting about your shop — without breaking FTC rules
- **Body:** Offer a perk, they post, we add the disclosure automatically. $79/mo, 14-day free trial.
- **Destination:** socialperks.app/try

---

## 4. Cold email (to ~30 local cafes/salons — the fastest first-customer path)
- **Subject:** quick question about your Instagram
- **Body:**
  > Hi [name] — I saw [shop] on Instagram and noticed your regulars clearly love the place. Quick question: do you ever offer a little perk (free drink, % off) to get customers to post or tag you?
  >
  > I built a tool that runs exactly that — customer posts in exchange for a perk — and auto-adds the FTC disclosure so you stay compliant (and it steers clear of the Google-review rules that can get your listing dinged). $79/mo, 14-day free trial, cancel anytime.
  >
  > Worth a 2-minute look? socialperks.app/try — happy to set your first campaign up myself.
  >
  > — [you]
- **Follow-up 1 (day 3):** "Bumping this — even if the tool's not a fit, curious: would you pay for something that got customers posting, or not worth it to you?" (doubles as a WTP probe)

---

## Reading the signal
- **Green light:** trial-starts from `/try` (any channel), or r/smallbusiness replies clustering at "$30–$80 yes."
- **Yellow:** clicks but no trial-starts → price or offer objection; test a $29 headline.
- **Kill signal:** replies cluster at "$0 / wouldn't pay," near-zero click-to-trial across channels.

Wire up PostHog on `/try` CTA clicks (`data-cta-source="try:*"`) + trial-start to measure this cleanly.
