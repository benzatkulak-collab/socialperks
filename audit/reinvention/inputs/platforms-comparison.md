# Platform Comparison — What Social Perks Should Steal, Where It Should Point, What It Must Avoid

*Input to the reinvention exercise · Date: 2026-06-12 · Author: consumer/social platform strategist pass*
*Method: web-verified facts (June 2026) + pre-cutoff platform knowledge + direct codebase checks in this worktree. Source URLs inline. Claims without a URL are well-established platform history (pre-2026) used for the "loved/ignored" analysis.*

---

## 0. Framing: Social Perks is not a social network — and that's the whole point

Every platform below spends billions solving two problems Social Perks never has to solve: **audience aggregation** (getting people to open the app) and **content supply** (getting people to post). Social Perks rides on top of those solved problems. Its actual jobs are narrower and different:

1. **Demand routing** — point an SMB's perk budget at the platform/action combos that actually move local revenue.
2. **Incentive mechanics** — make the customer's advocacy loop habit-forming (this is where the platforms' engagement playbooks are directly stealable).
3. **Compliance arbitrage** — know, better than any SMB ever will, exactly where incentivized content is legal, where it must be disclosed, and where it gets the business banned.

So each profile below ends in "what this means for Social Perks," and Part 2 synthesizes across all ten.

**Current Social Perks state (verified in-repo, post-PRs #108/#109):** perk wallet/programs/redemptions are now Postgres-durable (PR #108 "durable perk-wallet vertical"); trust/honesty remediation merged (PR #109). Billing still cannot take money (Stripe envs/price IDs/migration v5 pending per memory + audit). Relevant to this report: the action library spans 15 platforms / 107+ actions, and the campaign generator still emits incentivized Google-review campaigns (see §2.3 — this contradicts the product's own published compliance content).

---

## Part 1 — The ten platforms

### 1. TikTok

**2026 status:** Operating in the US as **TikTok USDS Joint Venture LLC** since January 2026 — Oracle, Silver Lake, and MGX majority; ByteDance retains 19.9% ([stackinfluence.com](https://stackinfluence.com/blog/ceo-of-tiktok-who-runs-the-platform-in-2026)). The ban saga is resolved; platform risk has shifted from "will it exist" to "post-sale algorithm/payout drift" — creators are already reporting **payout crashes and lower RPMs post-sale** ([eurweb.com](https://eurweb.com/tiktok-payout-drop/)).

- **Why users choose it:** the For You page — the strongest cold-start content-to-interest matcher ever built. You don't need followers to go viral; distribution is interest-based, not graph-based. 49% of US consumers now use TikTok *as a search engine* ([almcorp.com](https://almcorp.com/blog/tiktok-as-search-engine-2026-data/)).
- **Why they stay:** variable-reward dopamine loop (unpredictable feed quality), extreme personalization, and a creation culture with the lowest production bar (CapCut templates, sounds, duets/stitches).
- **Strongest growth loops:** (a) zero-follower virality → new creators get an early "first hit" and chase it forever; (b) sounds/trends as remixable templates — every participant advertises the trend; (c) watermarked exports seeding Reels/Shorts (other platforms' feeds become TikTok ads).
- **Strongest monetization:** TikTok Shop (social commerce + affiliate), live gifting, and the **Creator Rewards Program** — $0.40–$1.00+ RPM for 1-minute+ videos, gated at 10K followers / 100K 30-day views and now a "content health rating" quality gate ([socialcal.app](https://www.socialcal.app/blog/how-to-monetize-tiktok), [hopp.co](https://www.hopp.co/post/how-much-does-tiktok-pay-per-view-in-2026)). The lesson: **algorithmic, quality-weighted rewards** beat flat per-view funds (the original Creator Fund died because it diluted payouts as supply grew).
- **Features users love:** FYP, duet/stitch, sounds, CapCut integration, TikTok Shop affiliate for creators.
- **Features users ignore:** TikTok Now (BeReal clone — killed), longer-form/horizontal pushes, the resume feature, most of "TikTok for Business" self-serve beyond Spark Ads (SMBs find ads manager overkill).
- **For Social Perks:** TikTok is the #1 organic-reach arbitrage for SMBs *with visual product* (food, fitness, beauty, retail) — a customer's video can outperform the business's own. But it's the highest-variance channel, and TikTok's **September 2025 commercial-content rules** now require a "commercial content" toggle for anything posted in exchange for a *gift, payment, discount, or incentive*, with automated detection and FYP ineligibility for violations ([community.skeepers.io](https://community.skeepers.io/blog/tiktok-new-policy/), [tiktok.com/legal](https://www.tiktok.com/legal/page/global/bc-policy/en)). Every Social Perks TikTok action must force that toggle into the instructions.

### 2. Instagram

**2026 status:** the default visual identity layer. Monetization is a stack — invite-only Bonuses (~$0.03–$0.12/1K views tiered on engagement/retention/conversion), Gifts, Subscriptions, branded content — with brand deals still where creators actually earn ([kompozy.io](https://kompozy.io/creator-growth/instagram-monetization-2026), [creators.instagram.com/bonuses](https://creators.instagram.com/bonuses)).

- **Why users choose it:** it's the social *résumé* — where your aesthetic identity lives; the place friends, dates, and customers check you out. For businesses it is the de-facto storefront.
- **Why they stay:** the graph (friends are there), Stories' ephemerality (low-stakes daily posting), DMs as the real social layer (most sharing now happens in DMs, not feeds).
- **Strongest growth loops:** tagging/mentions (every tag is a referral), Stories mentions → reshares, Reels remixing TikTok's interest-graph distribution, collab posts (two accounts share one post's reach).
- **Strongest monetization:** ads (Meta's machine, best-in-class SMB self-serve), creator brand deals with the native **Paid Partnership label**, Shopping, Subscriptions.
- **Features users love:** Stories, Reels, DMs, collab posts, Broadcast Channels (creator→fan one-to-many), Close Friends; for businesses: tagging + location pages = free local SEO.
- **Features users ignore/abandoned:** IGTV (killed), Guides (killed), the dedicated Shop tab (demoted), NFT features (killed), Notes (meh), Threads cross-promo fatigue.
- **For Social Perks:** **Instagram is the single highest-ROI advocacy surface for SMBs in 2026.** 67% of Gen Z and 54% of 25–34s use Instagram to explore local businesses — for 18–24s it *outranks Google Maps* ([therr.app](https://www.therr.app/blog/2026/3_15_2026_social_search_local_business.html), [biziq.com](https://biziq.com/blog/local-search-statistics/)). A customer Story tagging a café is a geo-relevant, identity-endorsed referral to exactly the followers most likely to be local. Story-tag is also the lowest-effort action in the entire library (10 seconds, ephemeral, low social cost) — it should be the wedge action for every new business. Compliance: incentivized posts are allowed but require the Paid Partnership label / clear disclosure ([help.instagram.com](https://help.instagram.com/1109894795810258)).

### 3. YouTube

**2026 status:** the pension fund of the creator economy. YPP entry tier at 500 subs/3K watch-hours; Shorts pay from a pooled 45% rev-share at ~$0.03–$0.10 per 1K views vs. 55% on long-form ([vidiq.com](https://vidiq.com/blog/post/youtube-shorts-monetization/), [unkoa.com](https://www.unkoa.com/youtube-shorts-monetization-requirements/)).

- **Why users choose it:** search + depth. It's where intent lives ("how to fix X", "best Y near me", reviews). Content compounds for years instead of dying in 48 hours.
- **Why they stay:** subscriptions + watch history → the best long-horizon recommender; creators stay because **long-form RPMs are 10–50× Shorts/TikTok** and evergreen content keeps paying.
- **Strongest growth loops:** search/suggested-video flywheel (old videos recruit new subs forever); Shorts as top-of-funnel into long-form; embeds across the web.
- **Strongest monetization:** ad rev-share (the only at-scale, reliable creator salary on any platform), memberships, Super Thanks/Chat, BrandConnect.
- **Features users love:** the rev-share itself, chapters, playlists, community tab for established channels.
- **Features users ignore:** YouTube Stories (killed), original "Shorts Fund" v1 (replaced), most of YouTube Music's social features, Clips, channel "applause."
- **For Social Perks:** YouTube advocacy actions are high-effort/high-durability — a customer's "my experience at X" video or a local guide mentioning a business keeps converting for years (the *only* platform where a perk buys a durable asset rather than a flash of reach). But effort ≥4/5 means low completion; treat it as a premium-tier action for the business's superfan customers and for micro-creators. The structural lesson: **value actions by half-life, not just reach.** A Story = 24h; a TikTok = ~72h; a YouTube video or Google-indexed review = years. Social Perks' pricing oracle should price durability.

### 4. Patreon

**2026 status:** quietly massive — creator payouts crossed **$10B lifetime, >$2B/year**; ~286K creators with ≥1 paying member; all-in migration to subscription billing (deadline Nov 1, 2026) unlocking Free Trials, **Autopilot**, Gifting, Discounts ([backlinko.com](https://backlinko.com/patreon-users), [support.patreon.com](https://support.patreon.com/hc/en-us/articles/27992352573069-How-to-move-from-per-creation-to-subscription-billing)).

- **Why users choose it (fans):** direct patronage of someone they love — identity purchase, not content purchase. (Creators): owning the relationship + recurring revenue off-algorithm.
- **Why they stay:** sunk identity ("I'm a founding member"), exclusive community/back-catalog access, and the guilt-friction of canceling support for a person.
- **Strongest growth loops:** weak by design — growth is imported from other platforms ("link in bio"). That's the cautionary tale: **a monetization layer with no native discovery rides shotgun forever.**
- **Strongest monetization:** tiered memberships; the 2025+ playbook is *retention automation* — **Autopilot** auto-offers discounts to members about to churn and win-back offers to ex-members.
- **Features users love:** tiers, member-only posts/Discord role sync, Autopilot, gifting.
- **Features users ignore:** Patreon's own feed/app as a destination, Lens (killed), merch-as-a-benefit (operationally painful), per-creation billing (being sunset).
- **For Social Perks:** Patreon is the best **retention-mechanics** donor. Map it: business = creator, repeat advocate = patron. Steal (a) **tiers with named status** ("Regular" → "Insider" → "Ambassador") where higher advocacy tiers unlock better perks; (b) **Autopilot-style churn saves** — "Maya hasn't posted/visited in 45 days → auto-offer a bounce-back perk"; (c) **founding-member framing** for a business's first 10 advocates. Also the warning: Social Perks similarly has no native discovery — it must be parasitic on the platforms' loops (QR at point-of-sale, claim links inside the customer's own post) rather than hoping for marketplace traffic.

### 5. Discord

**2026 status:** filed confidential S-1 (Jan 2026), targeting ~Q1-2026 listing at ~$15B; >200M MAU, ~$879M revenue, still unprofitable; revenue = Nitro + **Quests** (advertising) + server commerce with a 90/10 creator split ([fintool.com](https://fintool.com/news/discord-ipo-filing), [tsginvest.com](https://tsginvest.com/discord/), [revenuememo.com](https://www.revenuememo.com/p/how-does-discord-make-money)).

- **Why users choose it:** persistent, intimate, *un-algorithmed* community — the third place. You join for a specific community (a game, a creator, a niche), not a feed.
- **Why they stay:** **roles and status.** Username colors, server ranks, mod badges, XP bots (MEE6), level-up announcements — the deepest status-mechanics stack in social. Plus real-time presence (voice channels) and FOMO of leaving a community you have standing in.
- **Strongest growth loops:** invite links as social objects (servers grow by member invitation — every member is a recruiter), Nitro gifting, integrations (every game/creator embeds "join our Discord").
- **Strongest monetization:** Nitro (users pay to *flex* — animated avatars, server boosts = patronage with public credit), Quests (play/watch-to-earn brand campaigns — **users complete sponsored tasks for in-game rewards**, the closest existing analog to Social Perks' action→perk loop at scale), server subscriptions/shop.
- **Features users love:** roles, server boosts (public patronage!), voice, emoji/sticker identity, webhooks/bots.
- **Features users ignore:** Stage Channels post-Clubhouse, the "Discover" tab as discovery, Student Hubs (killed), clips.
- **For Social Perks:** not an advocacy *target* (closed rooms, no public reach, no local discovery), but the best **mechanics donor** after Duolingo: (a) **roles/levels with public credit** — advocates earn visible status the business can recognize in-store; (b) **server-boost psychology** — let regulars "boost" a business and get a public credit wall; (c) **Quests** prove brands will pay per *completed verified task* — validates Social Perks' core unit-economics model. Discord's 90/10 commerce split also sets the fairness benchmark advocates will expect.

### 6. LinkedIn

**2026 status:** the only legacy network still growing engagement: video views +36%+ YoY, newsletters 500M+ subscriptions across 150K+ newsletters with 30–50% open rates; 80% of B2B social leads originate there ([digitalapplied.com](https://www.digitalapplied.com/blog/linkedin-statistics-2026-b2b-marketing-data), [contentin.io](https://contentin.io/blog/linkedin-content-statistics/)).

- **Why users choose it:** professional identity + career optionality. The profile *is* the product.
- **Why they stay:** career FOMO, recruiter inbound, and an algorithm that over-rewards posting (organic reach here is what Facebook's was in 2012 — deliberately inflated to bootstrap a creator class).
- **Strongest growth loops:** every employee/job change/congrats is network-visible; comments propagate to second-degree feeds (commenting is distribution); newsletters auto-invite your whole follower graph on launch.
- **Strongest monetization:** Talent/recruiter (the cash cow), ads, Premium subscriptions — note: creators are *not* meaningfully paid; they post for status and pipeline. Proof that **status + measurable business outcomes can replace cash rewards entirely.**
- **Features users love:** newsletters, native documents/carousels (7% engagement — highest format) ([socialinsider.io](https://www.socialinsider.io/social-media-benchmarks/linkedin)), video, "open to work" frames.
- **Features users ignore:** Stories (killed), audio events (mostly dead), Creator Mode (folded in), most of the games push.
- **For Social Perks:** the overlooked channel for **B2B-ish SMBs** — accountants, agencies, gyms with corporate memberships, caterers, commercial cleaners. A client posting "we work with X and they're great" on LinkedIn is a lead-gen event worth far more than a consumer Story. Social Perks' vertical templates should route service-business campaigns here, where competitors (Yotpo/Birdeye) don't play at all. Employee-advocacy actions ("our team's favorite vendor") are also uniquely LinkedIn-native.

### 7. Reddit

**2026 status:** the AI-era winner among legacy platforms: Q1-2026 revenue $663M (+69% YoY), ads +74%, net income $204M; ~$60M/yr Google AI-training data deal; rolling out AI-powered ad products (Max campaigns, Dynamic Product Ads with Shopify) ([sec.gov Q1-26](https://www.sec.gov/Archives/edgar/data/0001713445/000171344526000067/earningspressreleaseq126.htm), [heygotrade.com](https://www.heygotrade.com/en/blog/reddit-rddt-stock-monetizing-ai-training-data-community/)).

- **Why users choose it:** the honest answer. "best dentist in Austin **reddit**" is a default search pattern because Reddit is where shills get destroyed. Google's algorithm now massively surfaces Reddit threads for exactly these queries.
- **Why they stay:** pseudonymity (people say true things), niche depth (every interest has a live community), karma.
- **Strongest growth loops:** SEO (threads rank for everything, forever — Reddit content has a *decade* half-life), karma as a contribution treadmill, cross-post propagation.
- **Strongest monetization:** ads + **data licensing** (the new structural revenue line — human conversation as AI training data). The Contributor Program (cash for karma+gold) exists but is marginal.
- **Features users love:** old.reddit, niche subs, AMAs, awards-as-recognition.
- **Features users ignore:** Reddit chat/chat channels, avatars/collectible NFTs (faded), Reddit Live, the TikTok-style video feed.
- **For Social Perks:** **DO NOT incentivize Reddit posts — ever.** Undisclosed incentivized recommendations are both an FTC violation and cultural suicide (subreddits ban shills, threads naming the business as a shill rank in Google forever — *negative* SEO durability). Reddit's role in the Social Perks worldview: it's the canary. The *reason* customers trust peer content (92% trust people over brands; consumers trust other customers **9.8× more than influencers** — [wisernotify.com](https://wisernotify.com/blog/ugc-statistics/), [billo.app](https://billo.app/blog/ugc-statistics/)) is the same reason Reddit wins search. Social Perks' compliance engine should hard-block Reddit/forum actions the way it claims to block Google reviews, and its marketing should lean into "disclosed-and-authentic beats astroturf."

### 8. X (Twitter)

**2026 status:** structurally declining as a social network, repositioned as an AI data asset: 557M MAU (−4.9% YoY), ad revenue ~$2.26B (≈half pre-acquisition), Threads has passed it in daily mobile users; xAI acquired X (Mar 2025), then SpaceX acquired xAI (Feb 2026) ([autofaceless.ai](https://autofaceless.ai/blog/twitter-statistics-2026), [europeanbusinessmagazine.com](https://europeanbusinessmagazine.com/how-x-actually-makes-money-and-why-a-44-billion-bet-still-hasnt-paid-off/)).

- **Why users (still) choose it:** real-time news/sports/finance/tech discourse; the remaining "town square" muscle memory; community notes.
- **Why they stay:** habit + niche graphs (fintwit, tech twitter) that haven't fully re-formed elsewhere.
- **Strongest growth loops:** quote-tweet/retweet virality (still the fastest text-meme propagation anywhere).
- **Strongest monetization:** ads (impaired), Premium subscriptions, **creator ad-rev sharing** — which has become a cautionary tale: engagement-farming spam, rules churn (announced-then-retracted incentive changes, suspensions for unlabeled AI war content) ([socialmediatoday.com](https://www.socialmediatoday.com/news/x-formerly-twitter-announces-then-unannounces-monetization-update/815756/), [techcrunch.com](https://techcrunch.com/2026/03/03/x-says-it-will-suspend-creators-from-revenue-sharing-program-for-unlabeled-ai-posts-of-armed-conflict/)).
- **Features users love:** community notes, lists, bookmarks.
- **Features users ignore:** Spaces (faded), X Premium's long-video push, shopping, the "everything app" payments promise (still vapor for most users), Fleets (killed long ago).
- **For Social Perks:** low priority for local SMB advocacy — text posts about a café don't drive local discovery the way visual geo-tagged content does, the audience skews non-local, and platform volatility makes any X-specific investment risky. Keep 1–2 low-effort actions (a post + photo) for the rare business with a real X following; deprioritize in recommendations. X's creator-payout chaos is also the **anti-pattern**: never change reward rules retroactively, never make payout logic opaque — advocates churn instantly on perceived rug-pulls.

### 9. Beehiiv

**2026 status:** ~$30M+ ARR (mid-2025, growing), ~2:1 software:ads revenue; Ad Network paying $1M+/month to publishers; paid subs $19M to creators in 2025 (+138% YoY); April 2026 launched native podcast hosting at 0% take ([sacra.com](https://sacra.com/c/beehiiv/), [variety.com](https://variety.com/2026/tv/news/beehiiv-advertising-network-creators-newsletters-1236626247/), [beehiiv.com/blog](https://www.beehiiv.com/blog/beehiiv-the-state-of-newsletters-2026)).

- **Why users (creators) choose it:** it's the *growth-tooling* newsletter platform — built by Morning Brew's growth engineers; flat SaaS pricing (0% cut of subscriptions) vs. Substack's 10%.
- **Why they stay:** the toolkit compounds: referral program engine, Boosts, ad network, polls, A/B testing — switching costs grow with every workflow adopted.
- **Strongest growth loops:** (a) the **built-in referral program** (the Morning Brew "share with 3 friends, get a mug" milestone-rewards engine, productized); (b) **Boosts** — newsletters pay other newsletters per verified subscriber sent (a two-sided paid-referral marketplace); (c) every email footer is an ad for beehiiv.
- **Strongest monetization (for beehiiv):** SaaS tiers + take on Ad Network/Boosts. (For creators): sponsorships via the ad network, paid subs at 0% platform cut.
- **Features users love:** referral engine, Boosts, the ad network ("monetization without sales calls"), analytics.
- **Features users ignore:** the social-ish "beehiiv media kit" pages, much of the website builder (most still treat it as email-first).
- **For Social Perks:** the closest *business-model* sibling — **B2B SaaS that sells growth machinery, not audience.** Steal: (a) **milestone-based referral mechanics** (advocate refers 3 friends who claim a perk → unlocks bigger perk — the Morning Brew ladder applied to local customers); (b) **Boosts as a model for inter-business perk networks** ("the café pays the gym next door for cross-promo posts" — a two-sided local marketplace Social Perks could uniquely broker); (c) flat-SaaS + take-rate-on-marketplace as the revenue architecture; (d) their "State of" content marketing as the SEO playbook Social Perks' content surface already imitates.

### 10. Substack

**2026 status:** valued $1.1B (Series C, Jul 2025); 50M active subscriptions, 5M+ paid; ~$450M gross creator earnings in 2025; ~100K publications earning (Apr 2026, 2× YoY). The big story: **the app became the growth engine** — 32M new subscriptions originated *inside* the app in three months via Notes/recommendations/feed; video/Clips drive ~500K free subs ([sacra.com](https://sacra.com/c/substack/), [backlinko.com](https://backlinko.com/substack-users), [theworlddata.com](https://theworlddata.com/substack-statistics-and-facts/)).

- **Why users choose it (writers):** own the list, own the relationship, 10% take only when you earn; prestige ("I write a Substack" is a status claim).
- **Why they stay (readers):** parasocial loyalty to individual voices; the inbox is algorithm-proof. (Writers): recurring revenue + the recommendation network now drives real growth.
- **Strongest growth loops:** the **Recommendations network** — every publication recommends others at signup, compounding cross-pollination (this single feature reportedly drives the majority of new free subs); Notes as in-network discovery; clips exported to other platforms as top-of-funnel.
- **Strongest monetization:** 10% of paid subscriptions. Founding-member tiers, comped subs, group subs.
- **Features users love:** recommendations, the editor's simplicity, podcast/video paywalls, founding tiers.
- **Features users ignore:** chat (low usage outside top publications), the early crypto flirtations, "Substack for teams."
- **For Social Perks:** steal the **Recommendations network** wholesale, localized: when a customer claims a perk at the café, show "people who support this café also support [the bookshop two doors down]" — cross-business advocacy referral with the *businesses* as publications and *advocates* as subscribers. No loyalty competitor does local cross-recommendation. Also steal "founding member" framing for early advocates, and the lesson that **a tool layer can grow its own network later** (Substack spent 5 years as plumbing before Notes worked — Social Perks shouldn't build its own feed at 0 users, but the cross-business graph is the seed of one).

---

## Part 2 — Synthesis for Social Perks

### 2.1 Mechanics to steal (ranked by fit with the perk/advocacy loop)

| # | Mechanic | Donor platform(s) | Social Perks implementation | Why it works |
|---|----------|-------------------|------------------------------|--------------|
| 1 | **Streaks + milestone ladders** | Duolingo/Snapchat (reference), TikTok | Advocacy streaks: "3 months in a row posting about Luna Café → permanent +5% perk boost." Milestone badges at 1/5/10/25 actions. | Streaks lifted Duolingo D1 retention 12%→55%; 7-day-streak users are 2.3× more likely to engage daily; combined streak+milestone apps see 40–60% higher DAU ([plotline.so](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps), [thepmrepo.com](https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users-lessons-in-habit-formation)). The follower-bonus tier system already in `platforms.ts` is static; streaks make it *behavioral*. |
| 2 | **Status tiers with public credit** | Discord (roles/boosts), Patreon (tiers), Reddit (karma) | Named advocate levels per business ("Regular → Insider → Ambassador"), a public "wall of supporters" on the business's claim page, in-store recognition prompts. | LinkedIn proves status can substitute for cash; Discord proves people *pay* for visible status (boosts). Cheaper than raising perk values and harder to copy. |
| 3 | **Milestone referral engine** | Beehiiv/Morning Brew | "Refer 3 friends who claim this perk → unlock the big perk." Referral codes already exist in the codebase — wrap them in the ladder UX. | Structured referral programs ≈3× organic referral rates; referred customers spend ~200% more and retain 37% better ([demandsage.com](https://www.demandsage.com/referral-marketing-statistics/), [extole.com](https://www.extole.com/blog/referral-stats-to-know-in-2026/)). |
| 4 | **Cross-business recommendations network** | Substack Recommendations, Beehiiv Boosts | At perk-claim: "Supporters of Luna Café also earn at Iron Gym." Later: paid Boosts between local businesses. | Substack's single biggest free-growth driver (32M in-app subs/3mo); creates the multi-business network effect that makes Social Perks defensible and seeds its own local graph. |
| 5 | **Quality-weighted algorithmic rewards** | TikTok Creator Rewards (CHR gate), Instagram Bonus 2.0 | Don't pay flat per action — weight perk value by verified engagement/retention of the post (already have the verification hooks). Tell the customer *why* the perk scaled. | Flat creator funds (TikTok v1, YouTube Shorts Fund v1) all died of supply dilution; quality-weighted pools survived. Same math applies to a business's perk budget. |
| 6 | **Churn-save automation** | Patreon Autopilot | "This advocate hasn't posted/visited in 45 days → auto-send a bounce-back perk." Plumb into the existing drip/email layer once the queue worker is fixed. | Patreon made retention automation the headline feature of its 2025–26 billing migration — because win-back offers are the highest-ROI message in membership economics. |
| 7 | **Verified task→reward campaigns as ad product** | Discord Quests | Long-term: businesses fund "quests" (complete 3 actions this month → big perk), with completion verified — exactly Discord's brand-Quest model at local scale. | Quests prove advertisers pay per *verified completed action*, not per impression — Social Perks' native unit economics. |
| 8 | **Remixable templates / lowest-effort creation** | TikTok sounds, IG Story stickers | Ship per-business Story templates/sticker packs and pre-written caption scaffolds inside the claim flow — make the *post itself* a 10-second fill-in. | The platforms with the lowest creation bar win participation; completion rate is Social Perks' #1 funnel metric. |
| 9 | **Founding-member framing** | Patreon, Substack | A business's first 10 advocates get a permanent "Founding Supporter" badge + locked-in best perk. | Identity sunk-cost is the cheapest retention there is. |
| 10 | **Anti-pattern (do NOT copy)** | X rev-share chaos; Snapchat streak anxiety | Never change earned-perk rules retroactively; cap streak pressure (offer "streak freezes" like Duolingo). | X's announce-then-retract incentives torched creator trust ([socialmediatoday.com](https://www.socialmediatoday.com/news/x-formerly-twitter-announces-then-unannounces-monetization-update/815756/)); streak guilt without relief valves reads as manipulation for a *local business* relationship. |

### 2.2 Highest-ROI platforms for SMB customer-advocacy actions in 2026

Where does a customer's post actually drive local revenue? Ranked:

**Tier 1 — point the perk budget here**
1. **Instagram** — local discovery #1 for under-35s (67% Gen Z / 54% of 25–34s use it to explore local businesses; outranks Google Maps for 18–24s); geo-tags + Story mentions hit the customer's *local* graph; lowest-effort actions; incentives legal with disclosure ([therr.app](https://www.therr.app/blog/2026/3_15_2026_social_search_local_business.html)). UGC posts convert ~10× non-UGC social posts ([autofaceless.ai](https://autofaceless.ai/blog/ugc-statistics-2026)).
2. **TikTok** — 49% of US consumers use it as a search engine; 62% of Gen Z use it for local business exploration; highest viral upside per post for visual businesses ([almcorp.com](https://almcorp.com/blog/tiktok-as-search-engine-2026-data/)). Higher effort + new Sept-2025 disclosure regime; best for food/fitness/beauty/retail with visual product.

**Tier 2 — vertical-dependent**
3. **Facebook (incl. check-ins/Recommendations/local Groups)** — still where 35+ local customers and service-business word-of-mouth live; Recommendations are incentivizable with disclosure (unlike Google reviews). The codebase already treats this correctly (`answers-data.ts`).
4. **YouTube (incl. Shorts)** — durable, search-indexed advocacy; the only channel where one perk buys years of conversion; reserve for superfan/micro-creator campaigns.
5. **LinkedIn** — the unserved channel for service/B2B SMBs (80% of B2B social leads); client-testimonial posts and employee advocacy; zero competitor presence here.

**Tier 3 — selective / indirect only**
6. **Google reviews — HARD NO for incentives** (see 2.3) but the *destination* of the halo: run legal "ask" flows (QR/SMS, no incentive) alongside incentivized social campaigns. 98% of consumers search online for local businesses; reviews remain the local-SEO backbone ([biziq.com](https://biziq.com/blog/local-search-statistics/)).
7. **X** — only for businesses with an existing X-native audience; declining, non-local reach.
8. **Nextdoor** *(not in the original ten but strategically adjacent)* — neighbor recommendations are the purest local word-of-mouth; worth evaluating as an "ask, don't incentivize" channel like Google.

**Not advocacy targets (but model donors): Discord, Patreon, Reddit, Beehiiv, Substack.** Reddit is a hard-block (2.3). Beehiiv/Substack matter as channels for Social Perks' *own* growth (an SMB-marketing newsletter is the right audience-building move for a B2B SaaS) — not for customer advocacy actions.

### 2.3 Platform-policy risk map (the compliance moat — and the live bug)

| Surface | Rule (2025–26) | Risk if violated | Social Perks stance |
|---|---|---|---|
| **FTC (all platforms)** | Endorsement Guides + **Consumer Reviews & Testimonials Rule** (effective Oct 21 2024): incentivized reviews/posts must clearly disclose the material connection; *conditioning incentives on positivity is illegal even with disclosure*; civil penalties up to **$53,088/violation**; first 10 warning letters issued Dec 2025 ([ftc.gov](https://www.ftc.gov/news-events/news/press-releases/2023/06/federal-trade-commission-announces-updated-advertising-guides-combat-deceptive-reviews-endorsements), [natlawreview.com](https://natlawreview.com/article/what-are-fifteen-things-advertisers-need-know-about-ftcs-consumer-reviews-and), [wiserreview.com](https://wiserreview.com/blog/google-review-incentives/)) | Per-violation fines hit the *business* (Social Perks' customer) — existential for an SMB | Disclosure must be **enforced in-product** (pre-filled #ad / platform toggles, blocking submission without it), not advised. The June-2 audit found `compliance-engine.ts` only validates/advises while docs claim auto-injection — closing that gap is a launch blocker. Also: never gate perks on positive sentiment, anywhere in copy or review flow. |
| **Google Maps/Business Profile** | Incentivized reviews and review-gating explicitly banned; 2025–26 enforcement uses Gemini-powered pattern detection (geo-clustered review bursts = "review drive" signature); penalties up to profile suspension ([support.google.com](https://support.google.com/contributionpolicy/answer/7400114), [launchcodex.com](https://launchcodex.com/blog/seo-geo-ai/google-business-profile-review-policy-update/)) | The SMB loses its #1 local-SEO asset | **LIVE BUG:** `src/lib/ai-engine.ts:246–253` still generates a "Google Review Drive" campaign attaching a perk budget to Google review actions (`go_rv`, `go_rd`, `go_rp`), while `answers-data.ts` publicly claims "Social Perks blocks Google, Yelp, and TripAdvisor review campaigns by design — the platform refuses to launch them." Fix: hard-block incentivized review actions at the action-library level; convert the campaign to the legal "QR/SMS ask" flow the content already describes. |
| **TikTok** | Sept-2025 Branded Content Policy: any post made for a *gift, payment, discount, or incentive* must toggle "Disclose commercial content"; automated detection flags within 2–3 hrs, 24-hr cure window, else FYP-ineligible; giveaways/log-in-reward content in branded posts risks permanent bans ([community.skeepers.io](https://community.skeepers.io/blog/tiktok-new-policy/), [tiktok.com/legal](https://www.tiktok.com/legal/page/global/bc-policy/en)) | Customer's post gets suppressed (perk wasted) or account penalized | Bake the toggle into TikTok action instructions + verification check; never word perks as "giveaways" in TikTok campaign copy. |
| **Instagram/Meta** | Branded-content policies require the Paid Partnership label (or clear disclosure) for posts made for compensation incl. perks/discounts; applies to Feed, Stories, Reels, Live ([help.instagram.com](https://help.instagram.com/1109894795810258)) | Post takedowns, branded-content tool restrictions | Pre-fill disclosure in the claim-flow caption scaffold; verification should *check for it*. |
| **Yelp/TripAdvisor** | Prohibit any incentivized reviews and even review *solicitation* (Yelp); check-ins/photos OK | Consumer-alert banner on the business's Yelp page (public shaming) | Codebase already handles correctly (`ai-engine.ts:257` uses non-review Yelp actions only) — keep. |
| **Reddit** | Sitewide spam/self-promotion norms + per-sub rules; undisclosed incentivized recommendations = astroturfing | Permanent, Google-indexed "this business astroturfs" threads — *negative* durable SEO | Hard-block Reddit actions entirely; make it a stated principle (it markets the compliance moat). |
| **X** | Rev-share/monetization rules churn unpredictably; no stable incentivized-content framework | Low — but any X-specific build can be invalidated overnight | Minimal investment; generic disclosure (#ad). |

**The strategic read:** compliance is not overhead — it is the **product moat**. The SMB has no idea any of this exists; Yotpo/Birdeye dodge the question by staying in review-request land. "We know exactly where rewarding a customer post is legal, we force the disclosure, and we refuse to launch the campaigns that would get you banned" is a positioning no platform and no current competitor owns. But it only works if the engine *actually enforces* it — today the campaign generator contradicts the marketing copy.

### 2.4 What Social Perks can do better than each platform

| Platform | Its structural gap | Social Perks' edge |
|---|---|---|
| TikTok/Instagram | Pay/reward only top creators; the median *customer* gets nothing for advocacy; rewards are platform-wide, not business-specific | Reward the 150-follower regular whose 30 local followers are worth more to a café than 30K randoms; perks redeem *in-store* (foot traffic, not vanity reach) |
| YouTube | Monetization needs 500+ subs and months of grind | A customer earns on their *first* action, day one |
| Patreon | Fans pay creators; no mechanism for *earning* membership through actions | Advocacy-earned membership: status and perks earned by doing, not paying — and it's tied to a real-world business relationship |
| Discord | Status is trapped inside one server; no real-world redemption | Status redeems as real goods/discounts across a local business graph |
| LinkedIn | Advocacy (recommendations, posts) is unrewarded and unmeasured | Closes the loop: post → verified → perk → measured visit/revenue |
| Reddit | Authenticity *requires* zero incentives | Disclosed incentives + verification = scalable authenticity (the legal version of what Reddit polices for free) |
| X | Opaque, retroactively-changed creator payouts | Transparent, contract-like perk terms per action, never retroactive |
| Beehiiv | Growth tooling for newsletters only; no local/physical dimension | The same referral/Boost machinery for *physical* local businesses — a market beehiiv will never enter |
| Substack | Recommendations network is media-only | Local cross-business recommendations with real-world redemption — denser value per edge (neighbors, not strangers) |
| All ten | Aggregate audiences and tax access to them | Social Perks sells the *machinery* and lets the business keep the relationship — the beehiiv/Shopify posture ("arm the rebels") vs. the platform posture |

### 2.5 Bottom line for the reinvention

1. **Point the wedge at Instagram Story-tag campaigns** (lowest effort, highest local relevance, legal with disclosure) with TikTok as the upside channel for visual verticals — the 2026 local-discovery data makes this unambiguous.
2. **Steal retention, not feeds:** streaks + tiers + milestone referrals + churn-save perks (mechanics #1–3, #6) are buildable now on the durable perk-wallet from PR #108 and would differentiate from every loyalty/review competitor.
3. **Make compliance enforcement real** before launch: fix the Google Review Drive generator contradiction, enforce disclosure in-product, hard-block Reddit — then market the moat.
4. **The long-game network effect is the Substack/Beehiiv graft:** cross-business recommendations and inter-business Boosts turn a single-tenant SaaS into a local advocacy network — the only path on this list that compounds.

---

## Appendix: Key source URLs

- TikTok JV/ownership: https://stackinfluence.com/blog/ceo-of-tiktok-who-runs-the-platform-in-2026 · payouts: https://www.socialcal.app/blog/how-to-monetize-tiktok · https://www.hopp.co/post/how-much-does-tiktok-pay-per-view-in-2026 · post-sale RPM drop: https://eurweb.com/tiktok-payout-drop/
- TikTok branded-content policy: https://www.tiktok.com/legal/page/global/bc-policy/en · https://community.skeepers.io/blog/tiktok-new-policy/
- Instagram monetization: https://kompozy.io/creator-growth/instagram-monetization-2026 · https://creators.instagram.com/bonuses · paid-partnership label: https://help.instagram.com/1109894795810258
- YouTube YPP/Shorts: https://vidiq.com/blog/post/youtube-shorts-monetization/ · https://www.unkoa.com/youtube-shorts-monetization-requirements/
- Patreon: https://backlinko.com/patreon-users · https://support.patreon.com/hc/en-us/articles/27992352573069
- Discord IPO/monetization: https://fintool.com/news/discord-ipo-filing · https://tsginvest.com/discord/ · https://www.revenuememo.com/p/how-does-discord-make-money
- LinkedIn stats: https://www.digitalapplied.com/blog/linkedin-statistics-2026-b2b-marketing-data · https://contentin.io/blog/linkedin-content-statistics/ · https://www.socialinsider.io/social-media-benchmarks/linkedin
- Reddit Q1-26: https://www.sec.gov/Archives/edgar/data/0001713445/000171344526000067/earningspressreleaseq126.htm · https://www.heygotrade.com/en/blog/reddit-rddt-stock-monetizing-ai-training-data-community/
- X decline/creator program: https://autofaceless.ai/blog/twitter-statistics-2026 · https://europeanbusinessmagazine.com/how-x-actually-makes-money-and-why-a-44-billion-bet-still-hasnt-paid-off/ · https://www.socialmediatoday.com/news/x-formerly-twitter-announces-then-unannounces-monetization-update/815756/ · https://techcrunch.com/2026/03/03/x-says-it-will-suspend-creators-from-revenue-sharing-program-for-unlabeled-ai-posts-of-armed-conflict/
- Beehiiv: https://sacra.com/c/beehiiv/ · https://variety.com/2026/tv/news/beehiiv-advertising-network-creators-newsletters-1236626247/ · https://www.beehiiv.com/blog/beehiiv-the-state-of-newsletters-2026
- Substack: https://sacra.com/c/substack/ · https://backlinko.com/substack-users · https://theworlddata.com/substack-statistics-and-facts/
- Local discovery: https://www.therr.app/blog/2026/3_15_2026_social_search_local_business.html · https://biziq.com/blog/local-search-statistics/ · https://almcorp.com/blog/tiktok-as-search-engine-2026-data/
- UGC trust/conversion: https://autofaceless.ai/blog/ugc-statistics-2026 · https://wisernotify.com/blog/ugc-statistics/ · https://billo.app/blog/ugc-statistics/
- Referral/WOM stats: https://www.demandsage.com/referral-marketing-statistics/ · https://www.extole.com/blog/referral-stats-to-know-in-2026/
- FTC: https://www.ftc.gov/news-events/news/press-releases/2023/06/federal-trade-commission-announces-updated-advertising-guides-combat-deceptive-reviews-endorsements · https://natlawreview.com/article/what-are-fifteen-things-advertisers-need-know-about-ftcs-consumer-reviews-and
- Google review policy: https://support.google.com/contributionpolicy/answer/7400114 · https://launchcodex.com/blog/seo-geo-ai/google-business-profile-review-policy-update/ · https://wiserreview.com/blog/google-review-incentives/
- Streak/gamification retention: https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps · https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users-lessons-in-habit-formation
- Advocacy-software competitors: https://thecmo.com/tools/best-brand-advocacy-software/ · https://www.guideflow.com/blog/best-customer-advocacy-software
