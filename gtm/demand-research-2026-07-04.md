# Social Perks — Demand / GTM Research Brief (2026-07-04)

Method: 5 parallel web-researchers → synthesis → adversarial fact-check (cut several unverifiable stats). Sources inline. Confidence flagged.

## TL;DR
- **Perk-for-Google-review is a landmine — but our code already blocks it (verified, see bottom).** Google's Maps policy verbatim bans merchants offering "incentives … in exchange for posting any review" ([support.google.com](https://support.google.com/contributionpolicy/answer/7400114)). FTC 16 CFR §465.4 bans *sentiment-conditioned* incentives; penalty up to **$51,744/violation** ([law.cornell.edu](https://www.law.cornell.edu/cfr/text/16/465.4), [ftc.gov](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-publishes-inflation-adjusted-civil-penalty-amounts-2025)). The defensible loop is **perk-for-Instagram/TikTok-post** with auto FTC disclosure — our stated moat.
- **$10–25/mo is priced too low — reads as a "toy."** Market-clearing band for a single-location local-SMB tool is ~**$25–125/mo**, fattest at **$45–99**.
- **Real unoccupied gap:** nobody sells *perk-for-a-compliant-social-post* to **non-Shopify local storefronts** at $29–79. Enterprise suites (Podium ~$399–599, Birdeye quote-only) target chains; cheap apps (Yotpo/Stamped) are Shopify e-comm widgets.
- **Demand is plausible but UNPROVEN** — no verbatim owner complaint found. Closing that gap is the whole point of the demand test below.
- **"Free-forever" is the wrong default funnel:** freemium ~4.5% median convert; card-required 14-day trial ~44% per signup (caveat: fewer total signups).

## Recommended price: $29 / $79 / $149, trial-led
| Tier | Price | Position |
|---|---|---|
| Starter | **$29/mo** | 1 location, core perk-for-post loop, FTC auto-disclosure |
| Growth (flagship) | **$79/mo** | Full loop (UGC + referral + loyalty), analytics |
| Pro / Multi-loc | **$149/mo** | High anchor shown first; multi-location, API |
| Free | $0 | Lead-magnet only — NOT the funnel default |

Default funnel = **14-day card-required trial of Growth.** $29 undercuts NiceJob's $75 entry ~60%; $79 undercuts every single-point incumbent while bundling review+UGC+referral+compliance. (Current ~$10/$25 pricing is below the "toy floor.")

## Competitor pricing (confidence noted)
| Vendor | Price/mo | Conf | Gap SP exploits |
|---|---|---|---|
| NiceJob | $75 / $125 | HIGH (primary) | ~½ price, adds perk-for-post ([get.nicejob.com](https://get.nicejob.com/pricing)) |
| Loopy Loyalty | $25 / $69 / $95 | HIGH (primary) | Loyalty only, no UGC/compliance ([loopyloyalty.com](https://www.loopyloyalty.com/pricing)) |
| Square Loyalty | $45–49/loc (+POS) | HIGH | POS-locked; SP is POS-agnostic |
| Podium | ~$399/$599 (→$500–800 all-in) | MED (quote-gated) | Same buyer, far cheaper |
| Birdeye | Quote-only | — | Self-serve, no sales gate |
| Yotpo / Stamped | ~$15 / ~$23–199 | MED | Shopify-centric, no in-store perk-for-post |

## Value props
1. "Turn the customers already in your shop into TikTok/Instagram promoters — without breaking FTC rules."
2. "What Podium and Birdeye do for $500+/mo — the parts a coffee shop needs — for $79."
3. "Your first customer post goes live in a day, not a quarter."

## Demand test (do this before building more)
**Channel: r/smallbusiness (~2.5M).** Bans vendor spam → post a genuine problem, not a pitch:
> **Title:** Cafe owners — do you actually get customers to post about you on Instagram/TikTok? How?
> Word-of-mouth is our best channel but customers rarely post unless we ask — and when we do I'm nervous about FTC rules on "we gave them a free coffee for it." How do others handle it?
> 1. Do you offer a perk for a tagged post, or is that too risky?
> 2. If a tool auto-added the disclosure and tracked who posted, would you pay — **$0, ~$30, or ~$80/mo**?

Cluster at "$0" = kill signal. Higher-signal variant: a one-page "$79/mo compliant UGC engine" landing page with a **card-required trial** button; measure click-to-trial.

## Confidence & honesty
- HIGH (primary): Google/FTC/TikTok policy language, NiceJob & Loopy Loyalty pricing, r/smallbusiness size, conversion medians.
- Removed as unverifiable: "sub-$50 tools retain 23%", "$534 avg SMB budget / 41% under $500", "3-tier converts 1.4×", "43% churn in 90 days".
- **Biggest gap:** no verbatim owner complaint — the demand test exists to close it.

---

## ✅ Code verification (2026-07-04) — the Google-review landmine is ALREADY handled
`packages/shared/src/platforms.ts`: all third-party review actions are `incentivizable: false` — Google (`go_rv`, `go_rd`, `go_rp`), Google Maps (`gm_rv`, `gm_rp`), Yelp (`yp_rv`, `yp_rp`), TripAdvisor (`ta_rv`, `ta_rp`). Social content (TikTok/FB/YT) stays `true`. Guards: `isCompliantTemplate()` (`src/lib/campaign-templates.ts:766`) filters templates; `LegalComplianceEngine` (`src/lib/legal-compliance.ts`) blocks incentivized-review campaigns and recommends un-incentivized solicitation — exactly the research's fix. **No code change needed.**

## The one real actionable = REPRICE (founder decision)
Evidence says move off $10/$25 to **$29/$79/$149 + card-required trial**. Requires: (1) plan/price constants + pricing page, (2) NEW Stripe products/prices (dashboard), (3) env vars on Vercel. Founder call + Stripe access needed — not shipped autonomously.
