# Viral Growth Analysis (Phase 4)

*Grow without significant ad spend. Each loop: trigger → reward → conversion mechanism → k-factor estimate (assumptions stated) → effort → code it builds on. Grounded in `growth-surface.md`, `competitors-direct.md`, `platforms-comparison.md`, `funnel-walkthrough.md`.*

## 0. The structural advantage most competitors don't have

Social Perks has an **inherent B2B2C loop baked into the product mechanic**: every campaign a business runs puts a branded `/c/[id]` claim page (and a QR poster) in front of dozens–hundreds of that business's customers, and **every customer's social post IS distribution**. Two of those customers' viewers are themselves SMB owners. The claim page already carries a **"Powered by Social Perks — turn customers into your marketing team" footer linking home** (`growth §2a`). This is a self-funding acquisition surface that costs nothing per impression — the loop *is* the product. The job is to finish the last 5% of wiring on it, not invent new loops.

**Reality check:** k-factors below assume the loop is *closed* (the 5 breaks fixed) and OG images render (currently they don't — SVG). With the loop broken, every k-factor is effectively 0 today. Sequencing matters: **close the loop first, then these compound.**

## 1. The loops, ranked by (k-factor × feasibility)

### Loop A — The physical B2B2C loop (QR poster → post → claim page → next business) ⭐ build first
- **Trigger:** business prints the QR poster, puts it on the counter; a customer scans it.
- **Reward:** customer gets a perk (discount/free item) for a disclosed post; business gets free authentic UGC + new customers.
- **Conversion mechanism:** the post reaches the customer's followers → some visit the business → some scan the poster → and the branded claim-page footer + "every business should do this" realization converts SMB-owner viewers into signups.
- **k-factor (est.):** Assume 1 business runs a campaign, 30 customers/mo post, each post seen by ~150 followers, ~2% of viewers are local SMB owners, ~3% of those who see the footer/visit eventually sign up → ~30 × 150 × 0.02 × 0.03 ≈ **2.7 SMB-owner exposures → ~0.1–0.3 new businesses per active business per month** from the consumer side alone. **Plus** the business-refers-business loop (Loop B) stacks on top. Conservative blended **k ≈ 0.2–0.4** — sub-viral but compounding and *free*, and the dominant early-acquisition engine alongside local sales.
- **Effort:** S–M. Wire the **poster button** (API exists, hours), put share/poster on the **wizard success screen**, fix **OG images to PNG**. (`growth §2c,2e`, `funnel §3–4`)
- **Builds on:** existing poster route, /c/ page, OG routes.

### Loop B — Business-to-business referral ⭐ finish (cheapest real loop in the repo)
- **Trigger:** a happy business owner shares their referral link (dashboard "Refer & Earn" card already exists).
- **Reward:** $10–one-month credit to referrer on the referee's **paid** conversion (webhook crediting already built).
- **Conversion mechanism:** referee signs up via `/?ref=CODE` → attribution → credit on paid conversion.
- **k-factor (est.):** ~30% of satisfied SMBs name referrals their #1 marketing tool (`market-legal §2.4`); assume 1 in 8 paying businesses refers 1 who converts within their lifetime → **k ≈ 0.12**, but referred customers churn ~37% less and spend more (`platforms`), so the *quality-adjusted* value is higher.
- **Effort:** S. ~20 lines: **read the `sp-ref` cookie at signup**, call `recordConversion`, fix the 12/13-char truncation, **pick one referral system**. Everything expensive (durable tables, UI, webhook crediting) exists. (`growth §1`)
- **Sequencing caveat:** a referral program with 0 users refers nobody — **finish it but expect yield only after the first ~50 customers.**

### Loop C — Milestone referral on the consumer side ("refer 3 friends who claim → unlock the big perk")
- **Trigger:** customer on the claim page wants a bigger perk.
- **Reward:** tiered unlock (the InviteUnlock widget already renders +5%/+$2 for 3 shares).
- **Conversion mechanism:** friends click the shared claim link → claim → some post → loop A re-enters.
- **k-factor (est.):** structured milestone-referral programs run ~3× organic rates (`platforms`); assume 15% of claimers share, 3 friends each, 20% click→claim → **k ≈ 0.09** per claim event, but it fires on *every claim* so volume is high.
- **Effort:** M. Replace the **honor-system client widget** with the **orphaned server-side `invite-track` route** (HMAC tokens, dedupe) + carry `?invitedBy=` in shared URLs. (`growth §2b`)
- **Builds on:** existing invite-track backend (zero callers today).

### Loop D — Local cross-business network effect ⭐ the defensible one (build at scale)
- **Trigger:** customer claims a perk at Business A.
- **Reward:** discovery of nearby participating businesses ("supporters of Luna Cafe also earn at Iron Gym").
- **Conversion mechanism:** Substack-Recommendations-style cross-promo — this single mechanic drove the *majority* of Substack's new subs (32M in-app in 3 months) (`platforms`). Each business's customers become a discovery surface for neighboring businesses → businesses join *because their neighbors' customers are already there.*
- **k-factor:** N/A as simple invite-k; this is a **density/network effect** — value compounds super-linearly within a local cluster and is the **one loop no loyalty competitor has** = the long-term moat (`platforms`, `competitors`).
- **Effort:** M–L. Needs local density first (don't build pre-traction). Add Beehiiv-style paid Boosts between neighbors later as a revenue layer.

### Loop E — Achievement / streak / status (retention loop that feeds sharing)
- **Trigger:** customer/business hits a streak or status tier.
- **Reward:** permanent perk boost ("3 months posting → +5% forever") + named status ("Regular → Insider → Ambassador") + public wall of supporters.
- **Conversion mechanism:** streaks lifted Duolingo D1 retention 12%→55%; status can fully substitute for cash rewards (LinkedIn) and people pay for visible status (Discord) (`platforms`). Status-holders share more → feeds Loop A.
- **k-factor:** indirect (retention × share-rate multiplier). Convert the existing **static follower-bonus tiers into behavioral ones**; the **perk-program punch-card skeleton is already durable** and is the natural home. Add Duolingo-style streak freezes to avoid streak anxiety.
- **Effort:** M. (`platforms`, `growth §6`)

### Loop F — "Win card" social proof (influencer/customer share trigger)
- **Trigger:** a customer/advocate earns a perk.
- **Reward:** a shareable "I just earned X at [local business]" card.
- **Conversion mechanism:** the card links back to a claim/signup surface. **Blocked today by the SVG-OG bug** — the cards render imageless on every platform. Fix unlocks this for free.
- **Effort:** S (PNG conversion). (`growth §2c,2d`)

## 2. The three loops to build first

1. **Close + wire Loop A** (poster button, success-screen share, PNG OG) — the on-thesis physical loop matching the coffee-shop ICP. *Hours-to-days.*
2. **Finish Loop B** (referral cookie-read) — cheapest real loop; ready to harvest once customers exist. *A day.*
3. **Fix OG → PNG** (powers A, C, F) — multiplies every share surface at once. *A day.*

Loops D/E are the **retention + defensibility** layer for months 6+; don't build them before there's density and retention data.

## 3. Compounding model — 12 months from a 10-business seed (illustrative)

Assumptions (conservative, stated): start 10 active businesses month 0; founder-led + Square add ~25→45 net new/mo ramping; blended viral k ≈ 0.25 (Loops A+B+C) adds ~25% on top of acquired; ~30 customers/business/mo post; churn 4.5%/mo.

| Month | New (acquired) | Viral-added (k≈0.25) | Churned | Active businesses (EoM) | Customer posts/mo | Paying (~35%) | MRR (ARPU $39) |
|---|---|---|---|---|---|---|---|
| 1 | 20 | 5 | 1 | 34 | ~1,000 | 8 | ~$310 |
| 3 | 30 | 12 | 5 | ~95 | ~2,900 | 30 | ~$1,170 |
| 6 | 40 | 22 | 14 | ~230 | ~6,900 | 80 | ~$3,120 |
| 9 | 45 | 28 | 22 | ~380 | ~11,400 | 145 | ~$5,650 |
| 12 | 50 | 32 | 30 | ~560 | ~16,800 | 230 | ~$8,970 |

This reaches **~$9k MRR by month 12** on viral + local + marketplace alone (no ad spend), then the agency channel and success-fee layer carry it past $10k → $50k. **The model is dominated by churn and the viral coefficient** — both of which Loops D/E and the POS integration exist to improve. *(All figures illustrative estimates with stated assumptions, not forecasts.)*

> **Net:** the growth codebase has more surfaces than the company has employees by two orders of magnitude; what it lacks is the last 5% of wiring on each and a closed loop to feed them. Finish A+B+OG, and the "Powered by Social Perks" footer becomes a free, compounding acquisition engine pointed exactly at the right buyer.
