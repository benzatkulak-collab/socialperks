# Product Audit (Phase 1)

*Area-by-area. Per area: what's working / not working / missing opportunity / competitive position / revenue impact / retention impact. Grounded in all 8 inputs; codebase claims cite the source file.*

### Product vision
- **Working:** "Turn customers into your marketing team" is a sharp, true, differentiated promise; the hero copy ("Your customers love you. Pay them to say it online.") is concrete and good.
- **Not working:** vision is diluted across 3 audiences (SMB / influencer / enterprise) + a 4th (AI agents); "works for any business" clashes with the coffee-shops-only waitlist.
- **Opportunity:** narrow to "compliant customer-advocacy for local business" — a category nobody owns.
- **Competitive:** advantage (incumbents do reviews OR loyalty OR ambassadors-for-DTC, none do compliant local UGC-for-perks). **Rev/retention:** focus would lift both; diffusion suppresses both.

### Target users & personas
- **Working:** the real ICP (local consumer-facing SMB: coffee/salon/gym/restaurant/retail) is well-matched to the QR-claim mechanic.
- **Not working:** the product serves 4 personas; only persona 1 is fully built. Influencer persona's profile saves 404; enterprise persona can't exist in prod.
- **Opportunity:** one persona, one job ("systematize word-of-mouth, compliantly"). **Rev:** persona 1 is the only one that can pay. **Retention:** clarity reduces wrong-fit churn.

### Acquisition funnels
- **Working:** strong front (honest waitlist for "first 10 coffee shops"; PostHog acquisition funnel CTA→signup→checkout is visible).
- **Not working:** hero CTA lands on the login screen; fabricated social proof; dev/MCP strip mid-page; SEO mis-cast as a launch channel.
- **Opportunity:** Square marketplace + referral loop + local sales (near-zero CAC). **Rev:** the only viable channels at this ARPU/churn. **Retention:** n/a.

### Onboarding
- **Working:** **best part of the product** — 4-field signup → 3-step auto-launching wizard → confetti in ~4–6 min, good defaults, mobile-competent.
- **Not working:** success screen drops the user at peak motivation (no poster/share); business-type free-text matches only 10 hardcoded tips.
- **Opportunity:** put activation (poster + share + "text a customer") on the success screen. **Rev:** indirect. **Retention:** activation is the #1 retention lever.

### Activation
- **Not working (fatal):** the true first value moment (real customer post → redeemed perk) is **unreachable** — no poster button, 404 on submit, no review UI, approve awards nothing, no customer redemption surface.
- **Opportunity:** close the loop + define activation = "first customer claim within 7 days." **Rev/retention:** everything depends on this.

### Retention mechanisms
- **Not working:** dashboard amnesia erases work on day 2; nothing accumulates (loop broken); no weekly results; no streaks; drip is broken/spammy.
- **Working (latent):** perk-program punch-card skeleton is durable — the natural home for streaks.
- **Opportunity:** weekly results email + behavioral streaks + the local network effect. **Retention:** these are the engine the product currently lacks entirely.

### Viral loops
- **Working (latent):** inherent B2B2C loop — branded `/c/[id]` claim page + "Powered by Social Perks" footer on every customer-facing surface.
- **Not working:** OG images are SVG (render imageless everywhere); referral chain broken at signup; InviteUnlock is honor-system.
- **Opportunity:** finish the last 5% of wiring (see `04-viral-growth.md`). **Rev:** near-zero-CAC growth. 

### Referral systems
- **Working:** durable tables, dashboard UI, webhook crediting all exist.
- **Not working:** signup never reads the `sp-ref` cookie → conversions structurally 0; two parallel systems; 12/13-char truncation bug.
- **Opportunity:** ~20-line fix; pick one system. **Rev:** referrals are SMBs' self-reported #1 channel.

### Monetization / subscription model
- **Working:** Stripe checkout/webhook **code** is genuinely good; in-product upgrade surfaces (UsageBanner, PlanLimitModal) are well-designed.
- **Not working:** can't take money (env unset); no honest "why pay" (quota-only gate; feature gates unenforced; vapor features); 3 conflicting plan defs; lifecycle loses money-state on cold start.
- **Opportunity:** re-tier around real value; make billing trustworthy; add success-fee via POS. **Rev:** this is the revenue engine — currently non-functional.

### Marketplace dynamics
- **Not working:** the marketplace framing is unbacked — cashback settles off-platform, escrow is dead, `chargePlatformFee` never called, Connect take-rate 0%. The platform is structurally outside its own money flow.
- **Opportunity:** route redemption value through the platform (POS) to enable a take-rate. **Rev:** unlocks the scalable model.

### Influencer workflows
- **Not working (cut):** facade — profile 404s for real users, ~3,400 LOC dead, discovery serves fake businesses, payouts have no balance check (drain bug). Two-sided liquidity is a second startup.
- **Recommendation:** cut; revisit later as "customer advocates," not a creator marketplace.

### Brand partnerships
- **Not working:** none exist; sponsored-campaign model needs both sides + scale.
- **Opportunity:** later, at density; not now.

### Creator incentives
- **Working (latent):** follower-bonus tiers exist as pricing multipliers.
- **Opportunity:** convert static tiers into behavioral streaks/status (steal from Duolingo/Discord/Patreon). For *customers-as-advocates*, not influencers.

### AI features
- **Not working:** no LLM anywhere; "AI insights/generations" sold as paid; verification fakes "Graph API" evidence.
- **Opportunity:** build real vision verification (the moat) + honest LLM copy + concierge (see `08-ai-strategy.md`). **Rev:** honest premium + legal shield.

### Mobile experience
- **Working:** consistently competent — responsive landing, wizard, mobile-first claim page.
- **Not working:** admin unusable on mobile (but admin is being cut from the user path anyway).
- **Position:** above pre-launch norm; the customer-facing surfaces (where mobile matters most) are good.

### Desktop experience
- **Working:** the business portal/dashboard is desktop-solid; wizard and analytics render well.
- **Not working:** dashboard amnesia makes it feel broken on return; no billing link in nav.

### Trust systems
- **Not working (critical):** dispute theater (discards input, says "sent"); fabricated leaderboard/social proof; false "auto-review + SMS" copy; no business reviews; influencer reputation never surfaced; fraud engine not wired to the live submit path.
- **Opportunity:** compliance-by-design + real verification = trust as the product. **Rev/retention:** for a trust product, these lies are existential if exposed.

### Community systems
- **Not working:** none — no reviews, no reputation, no social graph in use.
- **Opportunity:** the local cross-business network is the one community/network effect worth building — later, at density.

### Data collection / analytics
- **Working:** PostHog acquisition funnel is visible; structured request tracing on every route.
- **Not working:** the entire value loop is analytically dark (0 named events for launch/claim/submit/redeem); no server-side capture; analytics_events table has 0 rows.
- **Opportunity:** instrument the loop server-side. **Retention:** can't improve what you can't see.

### Customer support
- **Not working:** "email support" promised, but no email leaves prod (`resend:missing`); password reset 404s; no help center/intercom.
- **Opportunity:** Resend live + a real reset flow + a simple help surface. **Retention:** support failures = silent churn.

> **Synthesis:** the product is **excellent at the parts a demo shows (landing, signup, wizard) and broken at the parts a real customer reaches (submit, review, award, redeem, return).** It is over-built across audiences and under-finished on the one loop that matters. The reinvention is subtraction + finishing, not addition.
