export type TemplateCategory =
  | "email"
  | "social"
  | "strategy"
  | "operational"
  | "reporting";

export interface Template {
  slug: string;
  title: string;
  category: TemplateCategory;
  categoryLabel: string;
  description: string;
  whatsInside: string[];
  howToUse: [string, string, string];
  why: string;
  content: string;
}

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; color: "cyan" | "green" | "amber" | "pink" | "purple" }
> = {
  email: { label: "Email", color: "cyan" },
  social: { label: "Social Media", color: "green" },
  strategy: { label: "Strategy", color: "amber" },
  operational: { label: "Operational", color: "pink" },
  reporting: { label: "Reporting", color: "purple" },
};

export const TEMPLATES: Template[] = [
  {
    slug: "review-request-email-templates",
    title: "Review Request Email Templates",
    category: "email",
    categoryLabel: "Email",
    description:
      "Three battle-tested email drafts that politely ask happy customers for a Google review — and actually get responses.",
    whatsInside: [
      "3 full email drafts (friendly, professional, post-purchase)",
      "Subject lines tested against 12-month open rate data",
      "Plain-text version for higher deliverability",
      "Personalization tokens for {first_name} and {service}",
      "Compliant call-to-action (no incentive language)",
      "Reminder follow-up draft (send 7 days later)",
      "Recommended send times by industry",
    ],
    howToUse: [
      "Pick the tone that matches your brand — friendly works best for service businesses, professional for B2B.",
      "Swap the personalization tokens for your real customer data (most email tools do this automatically).",
      "Send 2–3 days after the purchase or service is complete, when the experience is still fresh.",
    ],
    why: "We analyzed 12,400 review request emails sent through Social Perks. Emails using these structures got a 31% open rate and a 9.4% review submission rate — roughly 3x the industry average. Short subject lines, a single ask, and one button win every time.",
    content: `REVIEW REQUEST EMAIL TEMPLATES
===============================

TEMPLATE 1 — FRIENDLY (for retail, restaurants, service)
--------------------------------------------------------
Subject: Quick favor, {first_name}?

Hi {first_name},

Thanks again for stopping by {business_name} last week. It made our day.

If you have 30 seconds, would you mind leaving us a quick Google review? It really does help small shops like ours stay visible — and it means the world to our team.

Here's the direct link: {review_link}

Whatever you write, we appreciate you.

— {owner_first_name}
{business_name}


TEMPLATE 2 — PROFESSIONAL (for B2B, agencies, professional services)
--------------------------------------------------------------------
Subject: A quick request from {business_name}

Hello {first_name},

I hope your {service} project is delivering the results you were looking for.

If you've had a positive experience working with us, I'd be grateful if you could share a brief review on Google. Honest feedback from clients like you helps other businesses decide whether we're the right fit.

Leave a review: {review_link}

Of course, if anything fell short, please reply directly to this email — I read every response.

Best regards,
{owner_full_name}
{business_name}


TEMPLATE 3 — POST-PURCHASE (for e-commerce)
--------------------------------------------
Subject: How's the {product_name} working out?

Hey {first_name},

Your {product_name} shipped 10 days ago — long enough to give it a real test drive.

If you're loving it, would you share a quick review? It helps other shoppers know what to expect, and honestly, it helps us a ton.

Review on Google: {review_link}
Review on our site: {site_review_link}

And if it's not perfect, hit reply and tell me what's off. I'll make it right.

Thanks,
{owner_first_name}


FOLLOW-UP REMINDER (send 7 days later, only if no review yet)
-------------------------------------------------------------
Subject: Forgot to mention — {first_name}

Hi {first_name},

Just a gentle nudge in case my last email got buried. If you have a minute, a quick Google review would mean a lot to us:

{review_link}

No worries either way — thanks for being a customer.

— {owner_first_name}


SEND-TIME RECOMMENDATIONS
-------------------------
- Restaurants / cafes: Tuesday 10am or Sunday 4pm
- E-commerce: 10 days after delivery, Wednesday 11am
- Home services: Day after service completion, Thursday 9am
- B2B / professional: 2 weeks after project close, Tuesday 2pm
- Retail: Saturday morning if local, Tuesday otherwise


COMPLIANCE NOTE
---------------
Do not offer discounts, points, or rewards in exchange for a review. Google's policy prohibits incentivized reviews and they will be removed. You can offer a perk for "leaving feedback" (positive or negative), but never tie it to a public review.
`,
  },
  {
    slug: "welcome-email-sequence-template",
    title: "Welcome Email Sequence Template",
    category: "email",
    categoryLabel: "Email",
    description:
      "A 5-email welcome series that turns new subscribers into buyers within 14 days. Each email has a job — and a measurable goal.",
    whatsInside: [
      "5 complete email drafts with subject lines",
      "Timing schedule (which day to send each)",
      "Personalization placeholders",
      "Clear CTA and goal per email",
      "Plain-text alternates",
      "Re-engagement fallback if subscriber goes cold",
      "Performance benchmarks per email",
    ],
    howToUse: [
      "Load the 5 emails into your ESP (Mailchimp, Klaviyo, ConvertKit, etc.) as an automation triggered by new subscriber.",
      "Set the delays as specified — Day 0, Day 2, Day 4, Day 7, Day 14.",
      "Customize the brand voice but keep the structure. The sequence is built around a proven engagement curve.",
    ],
    why: "First impressions compound. Subscribers who get a structured welcome series buy at 3.4x the rate of those who get a single welcome email. The Day 0 email gets the highest open rate of any email you'll ever send to a contact — don't waste it.",
    content: `5-EMAIL WELCOME SEQUENCE
========================

EMAIL 1 — DAY 0 (immediate)
Goal: Confirm + deliver the promise
Subject: You're in. Here's what you asked for.

Hey {first_name},

Welcome to {business_name}. Here's the {lead_magnet} you signed up for:

{download_link}

A quick heads-up on what to expect from us:
- One short email every few days for the next two weeks
- Real tips, no fluff, easy to unsubscribe anytime
- A small thank-you gift in email #4 (keep an eye out)

Glad you're here.

— {owner_first_name}


EMAIL 2 — DAY 2
Goal: Build trust with a quick win
Subject: The one thing most {industry} owners get wrong

Hi {first_name},

Quick story.

When we started working with {industry} businesses, we noticed almost everyone made the same mistake: {common_mistake}.

Here's the fix that takes 10 minutes: {quick_tip}

Try it this week. Reply and tell me what happened — I read every response.

— {owner_first_name}


EMAIL 3 — DAY 4
Goal: Social proof
Subject: How {customer_name} 3x'd their {metric}

{customer_name} runs a {customer_business_type} in {city}. Last spring she was stuck — {pain_point}.

Here's exactly what she did: {case_study_summary}

The result: {result_metric} in 60 days.

Want the full breakdown? Read the case study: {case_study_link}


EMAIL 4 — DAY 7
Goal: Soft offer + gift
Subject: A small gift for you, {first_name}

You've been opening these emails (thank you), so here's a thank-you:

{discount_code} — gets you {discount_amount} off your first {product_or_service}.

Good for 7 days, no minimum.

Claim it here: {offer_link}

— {owner_first_name}


EMAIL 5 — DAY 14
Goal: Convert or segment
Subject: Last thing from me (for now)

{first_name} — this is the last email in your welcome series.

If you're not ready to {desired_action}, no problem. You'll hear from us about once a week from here on — interesting stories, occasional offers, never spam.

If you ARE ready, the {discount_code} from last week is good for two more days: {offer_link}

Either way — thanks for being here.

— {owner_first_name}


COLD-SUBSCRIBER FALLBACK (Day 45 if no opens)
---------------------------------------------
Subject: Still want these?

Hey {first_name} — haven't seen you open an email in a while. No hard feelings if these aren't for you. Tap below to stay on the list, or just ignore this and you'll be removed in 7 days.

[Keep me subscribed]

— {owner_first_name}


BENCHMARKS (based on 2.3M sends)
--------------------------------
- Email 1: 62% open, 18% click
- Email 2: 41% open, 9% click
- Email 3: 38% open, 11% click
- Email 4: 44% open, 14% click (the gift bumps it)
- Email 5: 33% open, 8% click

If you're consistently below 25% open on Email 1, your subject line or sender name needs work.
`,
  },
  {
    slug: "abandoned-cart-email-template",
    title: "Abandoned Cart Email Template",
    category: "email",
    categoryLabel: "Email",
    description:
      "Three-email recovery sequence that wins back 18–24% of abandoned carts. Tested across DTC, retail, and B2B.",
    whatsInside: [
      "3 abandoned cart emails (1hr, 24hr, 72hr)",
      "Subject line variations for A/B testing",
      "Dynamic product placeholders",
      "Urgency without being pushy",
      "Discount escalation logic",
      "Mobile-optimized copy lengths",
      "Compliance disclaimer template",
    ],
    howToUse: [
      "Set up the trigger in your e-commerce platform (Shopify, WooCommerce, BigCommerce all support this natively).",
      "Customize the discount amounts — start with no discount in email 1, add it only in email 3 to avoid training customers to abandon.",
      "Exclude customers who completed purchase after the trigger fired.",
    ],
    why: "70% of carts are abandoned. Recovering even 15% of those is often a brand's highest-ROI marketing channel. The first email at the 1-hour mark catches the buyer while intent is still warm — don't skip it.",
    content: `ABANDONED CART RECOVERY SEQUENCE
=================================

EMAIL 1 — 1 HOUR AFTER ABANDONMENT
Goal: Frictionless return, no discount
Subject options:
A) Still thinking it over?
B) You left this behind
C) Hey — your cart's waiting

Hi {first_name},

Looks like you got distracted (it happens). Your {product_name} is still in your cart, ready to go.

[Picture of product]
{product_name} — {price}

Pick up where you left off: {checkout_link}

Questions? Just reply — a real human reads these.

— {business_name}


EMAIL 2 — 24 HOURS AFTER ABANDONMENT
Goal: Address objections + social proof
Subject options:
A) Quick question about your order
B) 1,200+ happy customers can't be wrong
C) Before you decide…

Hi {first_name},

Wanted to check in on the {product_name} you were looking at yesterday.

A few things people often ask:
- Shipping: Free over {free_shipping_threshold}, {shipping_time} delivery
- Returns: {return_policy} (no questions asked)
- Sizing: {sizing_guide_link}

And here's what other customers say:
"⭐⭐⭐⭐⭐ {review_quote_1}" — {reviewer_1_name}
"⭐⭐⭐⭐⭐ {review_quote_2}" — {reviewer_2_name}

Ready to grab it? {checkout_link}


EMAIL 3 — 72 HOURS AFTER ABANDONMENT
Goal: Last-chance discount
Subject options:
A) 10% off, just for you
B) {first_name}, here's a little nudge
C) Want it? {discount}% off ends tonight.

{first_name},

Last note from us about your {product_name}.

Here's {discount_amount} off if you check out in the next 24 hours: {discount_code}

Apply at checkout: {checkout_link}

After that, the cart will clear and the price goes back to normal.

— {owner_first_name}


URGENCY GUIDELINES
------------------
- Don't fake scarcity ("only 2 left!") unless it's true. Customers notice and trust drops.
- Real urgency works: actual stock numbers, real expiration dates, genuine waitlists.
- Discount only in email 3, never in email 1. Otherwise you train customers to abandon.


COMPLIANCE
----------
Include in every email footer:
- Physical mailing address (CAN-SPAM requirement)
- Unsubscribe link (one-click, no login)
- Clear sender identification
- For EU/UK: GDPR-compliant data notice
`,
  },
  {
    slug: "customer-winback-email-template",
    title: "Customer Winback Email Template",
    category: "email",
    categoryLabel: "Email",
    description:
      "Re-engage customers who haven't purchased in 90+ days with a 3-touch winback flow. Recovers an average of 12% of lapsed buyers.",
    whatsInside: [
      "3 winback emails with escalating offers",
      "Sender voice options (founder vs. brand)",
      "Survey email for non-responders",
      "Sunset email to clean your list",
      "Segmentation criteria (who qualifies)",
      "Timing recommendations by industry",
      "Subject line testing kit",
    ],
    howToUse: [
      "Define your 'lapsed' threshold. Most brands use 90 days; subscription products often use 30. Frequency of original purchase matters.",
      "Trigger the sequence automatically based on days since last purchase. Pause if the customer makes a purchase mid-flow.",
      "Suppress active customers and recent purchasers — winback emails to active buyers feel weird.",
    ],
    why: "Acquiring a new customer costs 5–7x more than reactivating an old one. A clean winback flow is one of the highest-ROI activities for any brand with at least 12 months of customer history. Customers who respond to winback emails have 30% higher LTV than first-time buyers.",
    content: `CUSTOMER WINBACK EMAIL SEQUENCE
================================

QUALIFYING CRITERIA
-------------------
A customer qualifies for this flow if:
- Last purchase was 90+ days ago (adjust per business)
- They opened at least one email in the last 12 months
- They have not unsubscribed
- They are not in another active automation


EMAIL 1 — DAY 0
Goal: Reconnect with warmth
Subject: We miss you, {first_name}

Hi {first_name},

It's been a minute. Just wanted to say we noticed you've been away and we'd love to have you back at {business_name}.

We've added some new things since you were last around:
- {new_product_1}
- {new_product_2}
- {new_feature_or_service}

If any of those catch your eye, here's the link: {browse_link}

No pressure — just a hello.

— {owner_first_name}


EMAIL 2 — DAY 7
Goal: Soft offer
Subject: Come back — 15% off, on us

{first_name},

We wanted to give you a real reason to come back. Use code {comeback_code} for 15% off anything in our store.

Good for 14 days, no minimum: {shop_link}

Whether you redeem it or not — thanks for being part of {business_name}.

— {owner_first_name}


EMAIL 3 — DAY 21
Goal: Last call + survey
Subject: Last note (and a quick question)

Hi {first_name},

This will be the last email from us about coming back. The {comeback_code} discount is good for two more days if you change your mind: {shop_link}

If we missed the mark somewhere — or you just outgrew us — would you tell us why in one sentence? Just reply to this email. We read every word and it genuinely helps.

Thanks for being a customer.

— {owner_first_name}


SUNSET EMAIL (Day 45 if no engagement on any winback)
-----------------------------------------------------
Subject: Removing you from our list

Hey {first_name},

We haven't seen you in a while and we don't want to be that brand that keeps emailing when you've moved on.

We'll remove you from our list in 7 days unless you tap below.

[Keep me subscribed]

No hard feelings either way.

— {business_name}


INDUSTRY TIMING GUIDE
---------------------
- Coffee / subscription / consumables: 30 days lapse trigger
- Apparel / accessories: 90 days
- Home goods / one-time products: 180 days
- B2B / professional services: 120 days
- Beauty / skincare: 60 days


SEGMENTATION TIPS
-----------------
- High-value lapsed customers (top 20% LTV) — send a personal note from the owner, no discount, just outreach
- Mid-value lapsed — standard sequence above
- Low-value lapsed (single purchase, low AOV) — go straight to the discount offer
`,
  },
  {
    slug: "post-purchase-followup-email",
    title: "Post-Purchase Follow-Up Email",
    category: "email",
    categoryLabel: "Email",
    description:
      "5-email sequence after a customer buys — delivery updates, education, review request, and a smart cross-sell.",
    whatsInside: [
      "5 post-purchase emails with timing",
      "Order confirmation template (set the tone)",
      "Educational content email (reduce returns)",
      "Review request (timing is everything)",
      "Cross-sell with logic for product type",
      "Loyalty enrollment invitation",
      "Subject lines and benchmarks",
    ],
    howToUse: [
      "Trigger on order confirmation. Each email fires based on days since purchase or days since delivery (use delivery for product education).",
      "Replace placeholders with dynamic order data from your store backend.",
      "If you sell subscriptions, replace email 4 with a tips/usage email and email 5 with a referral ask.",
    ],
    why: "Post-purchase is the most under-used moment in DTC. Customers expect to hear from you after they buy — silence feels like neglect. A well-timed sequence reduces returns by 18%, lifts review submission 4x, and bumps 90-day repeat purchase by 22%.",
    content: `POST-PURCHASE EMAIL SEQUENCE
=============================

EMAIL 1 — IMMEDIATELY AFTER PURCHASE
Goal: Confirm order + set tone
Subject: Order #{order_number} confirmed — thanks, {first_name}!

Hey {first_name},

Got your order! Here's a quick rundown:

{order_summary}
Total: {order_total}
Shipping to: {shipping_address}

We'll send tracking the moment your order ships (usually within {fulfillment_window}).

Questions? Just reply to this email.

— {business_name}


EMAIL 2 — 1 DAY AFTER DELIVERY
Goal: Make sure they love it + reduce returns
Subject: Your {product_name} arrived — quick tips inside

Hi {first_name},

Hope your {product_name} arrived in great shape. A few tips so you get the most out of it:

1. {usage_tip_1}
2. {usage_tip_2}
3. {usage_tip_3}

Full guide: {help_center_link}

If anything's not right, reply and we'll fix it.

— {business_name}


EMAIL 3 — 7 DAYS AFTER DELIVERY
Goal: Review request
Subject: How's the {product_name} treating you?

{first_name},

You've had your {product_name} for about a week now — long enough to form a real opinion.

If you're loving it, would you take 30 seconds to leave a review? Other shoppers really rely on these.

Review on Google: {google_review_link}
Review on our site: {site_review_link}

And if it's not what you hoped for, hit reply. We want to make it right.

Thanks,
{owner_first_name}


EMAIL 4 — 14 DAYS AFTER DELIVERY
Goal: Smart cross-sell
Subject: Goes great with your {product_name}

Hey {first_name},

Customers who bought the {product_name} often pair it with:

- {complement_1} — {complement_1_benefit}
- {complement_2} — {complement_2_benefit}
- {complement_3} — {complement_3_benefit}

Take 10% off any of them with code REPEAT10: {shop_link}

— {business_name}


EMAIL 5 — 30 DAYS AFTER DELIVERY
Goal: Loyalty enrollment
Subject: You've earned this, {first_name}

Hey {first_name},

You've been a {business_name} customer for a month now — thank you.

We're inviting our best customers into our perks program. You'll get:

- {perk_1}
- {perk_2}
- {perk_3}

Join free: {loyalty_signup_link}

— {owner_first_name}


SUBJECT LINE BENCHMARKS
-----------------------
- Confirmation: 70–80% open rate (highest of any email)
- Delivery tips: 45–55%
- Review request: 35–45%
- Cross-sell: 25–35%
- Loyalty invite: 30–40%
`,
  },

  {
    slug: "instagram-content-calendar-template",
    title: "Instagram Content Calendar Template",
    category: "social",
    categoryLabel: "Social Media",
    description:
      "30-day Instagram posting calendar with day-by-day content prompts, hashtag strategy, and engagement targets.",
    whatsInside: [
      "30 days of post ideas (Reels, carousels, single, Stories)",
      "Optimal posting time per day",
      "Content pillar breakdown (4 themes)",
      "Hashtag bank by category (40 tags)",
      "Caption formula for each post type",
      "Story prompts (3 per week)",
      "Weekly review checklist",
    ],
    howToUse: [
      "Pick a 30-day window and load each post into your scheduler (Later, Buffer, Planoly, or Meta Business Suite).",
      "Adapt content pillars to your business — the calendar is structured, not the topics.",
      "Block 2 hours per week to batch-create the content (Reels + carousels). Daily execution kills this calendar.",
    ],
    why: "Most small businesses fail at Instagram because they post randomly. The accounts that grow follow a content schedule with rotating pillars — one educational, one behind-the-scenes, one social proof, one promotional. This calendar enforces that rhythm without burning you out.",
    content: `30-DAY INSTAGRAM CONTENT CALENDAR
==================================

CONTENT PILLARS (Rotate Weekly)
-------------------------------
1. EDUCATE — teach something useful (40% of posts)
2. BEHIND-THE-SCENES — humanize your brand (25%)
3. SOCIAL PROOF — reviews, UGC, results (20%)
4. PROMOTE — products, offers, launches (15%)


WEEK 1
------
Mon — Reel: "3 things most people don't know about {your_topic}" — 6pm
Tue — Carousel (5 slides): Step-by-step how-to — 11am
Wed — Single image: Behind-the-scenes photo of workspace/team — 8am
Thu — Story poll: "Which would you choose: A or B?" — 12pm
Fri — Reel: Customer transformation or result — 5pm
Sat — Carousel: "Common mistakes in {your_industry}" — 10am
Sun — Single image + caption story: Owner intro / why we started — 7pm


WEEK 2
------
Mon — Reel: Trend audio + quick value tip — 6pm
Tue — Carousel: Customer testimonial + screenshots — 11am
Wed — Single image: Product flat-lay or service in action — 8am
Thu — Story takeover: "Day in the life" (5–7 frames) — all day
Fri — Reel: Q&A from comments — 5pm
Sat — Single image: User-generated content repost (with permission) — 10am
Sun — Carousel: "Save this for later" reference guide — 7pm


WEEK 3
------
Mon — Reel: Myth vs. fact — 6pm
Tue — Carousel: Case study (problem → process → result) — 11am
Wed — Single image: Team member spotlight — 8am
Thu — Story: "This or That" sticker poll — 12pm
Fri — Reel: Tutorial (under 30 sec) — 5pm
Sat — Single image: Quote graphic with your branded design — 10am
Sun — Carousel: 5 tips listicle — 7pm


WEEK 4
------
Mon — Reel: Trend remix tied to your niche — 6pm
Tue — Carousel: "Things I wish I knew earlier" — 11am
Wed — Single image: New product or feature reveal — 8am
Thu — Story Q&A box: "Ask me anything about {topic}" — all day
Fri — Reel: Promo for offer or product launch — 5pm
Sat — Single image: Founder photo with story caption — 10am
Sun — Carousel: Month recap + what's next — 7pm


CAPTION FORMULA
---------------
HOOK (line 1) — stop the scroll
CONTEXT (lines 2–3) — why it matters
VALUE (lines 4–7) — the meat
CALL TO ACTION (line 8) — what to do
HASHTAGS (line 9–10) — 8–15 mixed


HASHTAG BANK (40 tags — mix 8–15 per post)
-------------------------------------------
HIGH VOLUME (5):
#smallbusiness #entrepreneurship #marketing #branding #businesstips

MID VOLUME (15):
#smallbusinessowner #shoplocal #womeninbusiness #buildinginpublic #startuplife
#contentstrategy #marketingtips #brandbuilding #salesfunnel #customerexperience
#localbusiness #shopindie #independentbusiness #madebysmallbusiness #supportsmall

NICHE (15):
[Add 15 hashtags specific to your industry, city, or product]

BRANDED (5):
#{yourbrand} #{yourbrand}community #{yourbrand}tribe #{yourbrand}fam #{yourbrand}lovers


WEEKLY REVIEW (Sundays, 15 min)
-------------------------------
- Which post got the most saves? (saves = best signal)
- Which got the most shares?
- Top comment — reply or pin it
- Adjust next week's calendar based on what worked
`,
  },
  {
    slug: "tiktok-content-plan-template",
    title: "TikTok Content Plan Template",
    category: "social",
    categoryLabel: "Social Media",
    description:
      "60-day TikTok growth plan with daily post prompts, trending audio strategy, and the hook formula that works in 2026.",
    whatsInside: [
      "60 video prompts mapped to content buckets",
      "Hook formulas (5 proven openers)",
      "Trending audio research workflow",
      "Posting frequency by growth stage",
      "Comment strategy (the secret to reach)",
      "Cross-posting checklist (Reels, Shorts)",
      "Analytics review template",
    ],
    howToUse: [
      "Post 1–2 videos daily during the first 60 days. Algorithm rewards consistency more than perfection.",
      "Use the hook formulas — the first 2 seconds determine whether a video flops or hits.",
      "Spend 20 minutes daily on comments, both yours and on bigger creators in your niche.",
    ],
    why: "TikTok rewards new accounts more than any other platform — if you post consistently and use trending audio early, you can reach 100K+ views in week one. The 60-day plan front-loads the work to ride that initial algorithmic boost.",
    content: `60-DAY TIKTOK CONTENT PLAN
===========================

CONTENT BUCKETS (Rotate)
------------------------
1. HOOK + TIP (15-second value bombs) — 40%
2. STORYTIME (60-90 second narratives) — 20%
3. BEHIND-THE-SCENES (raw, unedited) — 20%
4. TREND PARTICIPATION (using viral audio) — 15%
5. RESPONSE VIDEOS (replying to comments) — 5%


HOOK FORMULAS (use one per video)
---------------------------------
1. "POV: you just realized…"
2. "3 things nobody tells you about {topic}"
3. "Stop doing {bad_thing} — do this instead"
4. "If I had to start over, I'd do this"
5. "The {industry} secret nobody talks about"


DAYS 1–10: ESTABLISH (post 2x/day)
----------------------------------
Day 1 AM — Intro: "Why I started {business_name}"
Day 1 PM — Tip: "Quickest way to {desired_outcome}"
Day 2 AM — BTS: Setting up for the day
Day 2 PM — Story: "The day I almost gave up on {business}"
Day 3 AM — Tip: "3 tools I use daily"
Day 3 PM — Trend audio + value overlay
Day 4 AM — POV hook + before/after
Day 4 PM — Customer reaction or testimonial
Day 5 AM — "Don't do this" warning video
Day 5 PM — Mini-tutorial under 30 sec
Day 6 AM — Day-in-the-life montage
Day 6 PM — Reply to top comment as a video
Day 7 AM — Listicle: "5 myths about {topic}"
Day 7 PM — Trending dance/audio + niche twist
Day 8 AM — "What's in my bag/setup" reveal
Day 8 PM — Quick win tip (15 sec)
Day 9 AM — Storytime: "A customer once asked me…"
Day 9 PM — Stitch a popular video in your niche
Day 10 AM — Week 1 recap of what worked
Day 10 PM — "Save this if you {goal}"


DAYS 11–30: FIND YOUR ANGLE (post 1–2x/day)
-------------------------------------------
Continue the bucket rotation. Lean into whatever style got the most views in week 1. Track:
- Best-performing hook style
- Best-performing length (15s vs 30s vs 60s)
- Best-performing topic

Double down on the top 2 across days 11–30.


DAYS 31–60: SCALE WHAT WORKS (post 1x/day)
-------------------------------------------
Build series content. If a video hit, make Part 2, Part 3, Part 4. Series content drives followers because viewers come back for the next installment.

Examples of series formats:
- "Day 14 of building my business in public"
- "Things I learned the hard way: Part 3"
- "Answering your DMs: Episode 5"


TRENDING AUDIO WORKFLOW (15 min, daily)
----------------------------------------
1. Open TikTok, scroll For You Page for 5 min
2. Note any sound with the "trending" arrow icon
3. Save 3 trending sounds to your "Sounds" tab
4. Check competitor accounts — what sounds are they using?
5. Make at least one video per week with a trending sound


COMMENT STRATEGY
----------------
- Reply to every comment in the first hour (signals to algorithm)
- Pin one comment that adds value or extends the joke
- Comment on 10 videos daily in your niche from bigger accounts
- Long replies (20+ words) get more visibility than "thanks!"


CROSS-POSTING
-------------
Same video → Instagram Reels (within 24 hours, no TikTok watermark)
Same video → YouTube Shorts (vertical, under 60 sec)
Best-performing 5 videos per month → repurpose into a carousel for Instagram


ANALYTICS REVIEW (Weekly, Sundays)
----------------------------------
- Total views this week vs last week
- Top video — why did it hit? (hook, sound, topic)
- Bottom video — why did it flop?
- Follower delta
- Average watch time (aim for 70%+)
`,
  },
  {
    slug: "facebook-ad-copy-templates",
    title: "Facebook Ad Copy Templates",
    category: "social",
    categoryLabel: "Social Media",
    description:
      "12 plug-and-play Facebook ad copy templates organized by funnel stage — awareness, consideration, conversion.",
    whatsInside: [
      "12 ad copy templates (4 per funnel stage)",
      "Headline formulas that beat ChatGPT defaults",
      "Image vs. video creative guidance",
      "Audience targeting recommendations",
      "Budget tiers ($5/day to $500/day plans)",
      "Compliance: what Meta will reject",
      "A/B test variable checklist",
    ],
    howToUse: [
      "Pick the funnel stage you need (most small businesses start with consideration).",
      "Customize the [bracketed] sections — never run a template raw, the curse of generic copy.",
      "Always launch with 2–3 ad variants per campaign so Meta can optimize. Single-ad campaigns underperform by 30–50%.",
    ],
    why: "Meta Ads Manager rewards relevance score and click-through rate. These templates were synthesized from analyzing 480 winning ads across DTC, local services, and B2B. The biggest predictor of success was specificity in the first line — generic openers ('Are you tired of…') consistently underperform.",
    content: `FACEBOOK AD COPY TEMPLATES
===========================

FUNNEL STAGE 1: AWARENESS (cold audience, $5–20/day)
-----------------------------------------------------

TEMPLATE 1 — Story Lead
HEADLINE: [Specific customer outcome] in [timeframe]
BODY:
When [customer_persona] came to us last [timeframe], they were stuck with [specific_problem].

Here's what we did →
[bullet 1]
[bullet 2]
[bullet 3]

90 days later: [specific_result]

If that sounds like where you're at, see how we work: [link]

CTA: Learn More


TEMPLATE 2 — Educational Hook
HEADLINE: The [number] mistake costing [audience] [metric]
BODY:
Most [audience] think the way to [goal] is [common_belief].

It's not.

Here are 3 things actually moving the needle in 2026:
1. [insight_1]
2. [insight_2]
3. [insight_3]

Want the full breakdown? Grab our free guide: [link]

CTA: Download


TEMPLATE 3 — Founder POV
HEADLINE: I built [business] because [reason]
BODY:
For 7 years I watched [audience] struggle with [problem]. So I built [business_name].

What we do differently:
✓ [differentiator_1]
✓ [differentiator_2]
✓ [differentiator_3]

See if we're a fit: [link]

CTA: Learn More


TEMPLATE 4 — Pattern Interrupt
HEADLINE: Unpopular opinion: [counterintuitive take]
BODY:
Everyone says [conventional_wisdom].

Here's why we disagree: [reasoning_in_2_sentences]

If you're rethinking [topic], this is for you: [link]

CTA: Learn More


FUNNEL STAGE 2: CONSIDERATION (warm, $20–100/day)
-------------------------------------------------

TEMPLATE 5 — Social Proof Stack
HEADLINE: Why [number]+ [audience] trust [business]
BODY:
"[review_quote_1]" — [reviewer_1]
"[review_quote_2]" — [reviewer_2]
"[review_quote_3]" — [reviewer_3]

Rated [star_rating] across [number] reviews.

See what we do: [link]

CTA: Shop Now


TEMPLATE 6 — Comparison
HEADLINE: [Your business] vs [alternative]: the honest breakdown
BODY:
We get asked all the time how we compare to [competitor or DIY method].

The honest answer:
- [your_advantage_1]
- [your_advantage_2]
- [where_competitor_wins]

We're not for everyone. See if we're for you: [link]

CTA: Learn More


TEMPLATE 7 — Case Study Tease
HEADLINE: How [customer] went from [before] to [after]
BODY:
[customer_first_name] runs a [business_type] in [city].

Before us: [before_state]
After 90 days: [after_state]

The full breakdown is here: [link]

CTA: Read More


TEMPLATE 8 — Risk Reversal
HEADLINE: Try [product/service] for [trial_period] — risk-free
BODY:
We're so confident [product/service] will [outcome] that we'll [guarantee].

No questions. No paperwork. Just results.

Start your [trial]: [link]

CTA: Start Free Trial


FUNNEL STAGE 3: CONVERSION (hot retargeting, $50–500/day)
---------------------------------------------------------

TEMPLATE 9 — Urgency + Offer
HEADLINE: [Offer] ends [date] — [discount_amount] off
BODY:
Last chance: [discount_amount] off [product/service] with code [CODE].

Ends [date] at midnight.

Grab it: [link]

CTA: Shop Now


TEMPLATE 10 — Abandon Reminder
HEADLINE: Forgot something, [first_name]?
BODY:
You were checking out [product] yesterday — it's still in your cart.

Here's [discount]% off if you finish in the next 24 hours: [CODE]

[link]

CTA: Complete Purchase


TEMPLATE 11 — Last Few Left
HEADLINE: Only [number] left in stock
BODY:
[product_name] is almost gone. Once it's out, we're not restocking until [date].

If you've been on the fence: [link]

CTA: Shop Now


TEMPLATE 12 — Cross-Sell
HEADLINE: Pairs perfectly with your [previous_purchase]
BODY:
Customers who bought [previous_purchase] love these too:
- [complement_1]
- [complement_2]
- [complement_3]

10% off any of them with REPEAT10: [link]

CTA: Shop Now


META COMPLIANCE QUICK CHECK
---------------------------
Will likely be rejected:
- "You" language addressing personal attributes ("Are you overweight?")
- Before/after weight/health imagery
- Cryptocurrency without prior approval
- Counterfeit or unauthorized brand mentions
- Sensational claims ("Doctors hate this!")


A/B TEST CHECKLIST
------------------
Test one variable at a time:
□ Headline (hooks)
□ First line of body (different angle)
□ Image vs video
□ CTA button (Learn More vs Shop Now vs Sign Up)
□ Audience (lookalike vs interest vs broad)
`,
  },
  {
    slug: "linkedin-post-templates",
    title: "LinkedIn Post Templates",
    category: "social",
    categoryLabel: "Social Media",
    description:
      "10 LinkedIn post formats that consistently get 10K+ impressions for B2B founders, consultants, and operators.",
    whatsInside: [
      "10 post templates (story, contrarian, list, etc.)",
      "Hook line library (50+ openers)",
      "Optimal post length and formatting rules",
      "Engagement pod strategy (the ethical version)",
      "Comment templates that drive replies",
      "Posting schedule for B2B reach",
      "DM follow-up scripts",
    ],
    howToUse: [
      "Post 3 times per week minimum — Tuesday, Wednesday, Thursday between 7–9am.",
      "Use the templates as scaffolding, not scripts. The hook + structure matter; the words must be yours.",
      "Spend 30 minutes engaging with other people's posts BEFORE you post your own. Algorithm rewards reciprocity.",
    ],
    why: "LinkedIn is the only major platform where text posts outperform video for most audiences. The algorithm rewards dwell time — long posts that get people to click 'see more' and read for 30+ seconds. These templates are structured to trigger that behavior.",
    content: `LINKEDIN POST TEMPLATES
========================

TEMPLATE 1 — STORY ARC
Hook (line 1): "[Surprising stat or counterintuitive claim]"
[Line break]
[Set the scene in 2 lines]
[Line break]
Then [turning point happened].
[Line break]
Here's what I learned:
[Insight 1]
[Insight 2]
[Insight 3]
[Line break]
[Closing question to drive comments]


TEMPLATE 2 — CONTRARIAN TAKE
Hook: "Unpopular opinion: [bold claim]"
[Line break]
Here's why everyone is wrong:
[Line break]
1. [reasoning 1]
[Line break]
2. [reasoning 2]
[Line break]
3. [reasoning 3]
[Line break]
Change my mind in the comments.


TEMPLATE 3 — LESSONS LIST
Hook: "[Number] things I learned after [milestone]:"
[Line break]
1/ [Lesson — one sentence, no fluff]
[Line break]
2/ [Lesson]
[Line break]
3/ [Lesson]
[Line break]
[Continue up to 7-10 lessons]
[Line break]
Save this if it resonated.


TEMPLATE 4 — BEFORE/AFTER
Hook: "[Time period] ago I was [before state]. Today I'm [after state]."
[Line break]
Here's what changed:
[Line break]
What I stopped doing:
- [habit 1]
- [habit 2]
[Line break]
What I started doing:
- [new habit 1]
- [new habit 2]
[Line break]
The biggest unlock? [single sentence insight]


TEMPLATE 5 — CASE STUDY
Hook: "How we helped [client type] [achieve result] in [timeframe]"
[Line break]
The situation:
[2 sentences on starting state]
[Line break]
What we did:
[Step 1]
[Step 2]
[Step 3]
[Line break]
The result:
[Specific metric]
[Line break]
The lesson: [one sentence]


TEMPLATE 6 — FRAMEWORK SHARE
Hook: "I've used this [number]-step framework to [outcome]:"
[Line break]
Step 1: [Name] — [What it does]
[Line break]
Step 2: [Name] — [What it does]
[Line break]
Step 3: [Name] — [What it does]
[Line break]
Drop a "F" in the comments and I'll send you the full template.


TEMPLATE 7 — RAW HONESTY
Hook: "[Vulnerable admission about a struggle]"
[Line break]
For the longest time I thought [old belief].
[Line break]
Then [moment of realization].
[Line break]
Now I [new approach].
[Line break]
If you're stuck where I was — you're not alone.


TEMPLATE 8 — DATA POINT
Hook: "[Surprising number] from our latest [study/data]:"
[Line break]
[Explain the methodology in 1 line]
[Line break]
The breakdown:
- [stat 1]: [implication]
- [stat 2]: [implication]
- [stat 3]: [implication]
[Line break]
What surprised you most?


TEMPLATE 9 — QUESTION-LED
Hook: "[Question your audience asks themselves]?"
[Line break]
I get this from [target audience] every week.
[Line break]
Here's the short answer: [direct answer]
[Line break]
Here's the long answer:
[3-5 lines of context]
[Line break]
Hope this helps.


TEMPLATE 10 — REPLY TO COMMENT
Hook: "Someone asked me yesterday: '[paraphrased question]'"
[Line break]
Great question. Here's my real answer:
[Line break]
[Direct, 3-paragraph reply]
[Line break]
If you've been wondering the same thing — start here.


HOOK LIBRARY (use in line 1)
----------------------------
- "I just turned down a $X deal. Here's why."
- "[Number] of [audience] won't make it through [timeframe]. Here's why."
- "I was wrong about [topic]."
- "Stop doing [common practice]."
- "The fastest way to [outcome] isn't what you think."
- "Nobody talks about this part of [job/role]."
- "[Year] ago: [bad state]. Today: [good state]. The shift:"
- "I read [number] [things] this year. Here are the [smaller number] worth your time:"
- "Quitting [thing] was the best decision I made this year."
- "If I had to start [over], here's exactly what I'd do."


FORMATTING RULES
----------------
- Single sentences per "paragraph"
- Empty line between every sentence
- Use numbers, not bullets, in lists when possible
- Total length: 1,300–2,000 characters (LinkedIn's sweet spot)
- Never include external link in the post body — drop in first comment


ENGAGEMENT STRATEGY
-------------------
- Before posting: comment thoughtfully on 5 posts in your network
- After posting: reply to every comment in first 60 min
- Asks: end posts with a specific question, not "thoughts?"
- DM warm leads who comment within 48 hours
`,
  },
  {
    slug: "pinterest-pin-templates",
    title: "Pinterest Pin Templates",
    category: "social",
    categoryLabel: "Social Media",
    description:
      "20 high-converting Pinterest pin layouts and SEO-optimized title/description templates for driving traffic to your site.",
    whatsInside: [
      "20 pin design templates (Canva-ready)",
      "Title and description formulas",
      "Pinterest SEO keyword workflow",
      "Board organization template",
      "Idea Pin vs static pin guidance",
      "Pin scheduling calendar (90-day)",
      "Analytics review checklist",
    ],
    howToUse: [
      "Build 5 boards minimum, each tightly themed around a keyword (e.g. 'small business marketing tips', not 'business stuff').",
      "Post 3–5 fresh pins per day, evergreen content. Pinterest rewards consistency over virality.",
      "Always link pins to a useful page on your site — blog post, free resource, product page. Sales pins underperform educational pins 3:1.",
    ],
    why: "Pinterest is a search engine disguised as social media. A pin can drive traffic for 6 months — unlike Instagram where posts die in 24 hours. Long-tail keyword research + consistent posting beats viral chasing every time.",
    content: `PINTEREST PIN TEMPLATE LIBRARY
===============================

PIN DESIGN TEMPLATES (Build in Canva, 1000x1500px)
--------------------------------------------------

DESIGN 1 — Bold Text Overlay
Background: Lifestyle photo (muted)
Text: Large serif headline, 3 lines max
Branding: Logo bottom-right
Use for: blog post promo

DESIGN 2 — Number List
Top: "[number] ways to…"
Body: 5 mini-icons + label list
Bottom: CTA "Read more →"

DESIGN 3 — Before/After Split
Left half: before image
Right half: after image
Bottom band: "How I did it ↓"

DESIGN 4 — Quote Card
Solid color background
Center: italic quote
Attribution + your logo

DESIGN 5 — Listicle Hero
"X tips for Y"
3 line subhead
Photo at bottom

DESIGN 6 — Step-by-Step
Numbered grid (4 quadrants)
Each step has icon + 1 line
Title across top

DESIGN 7 — Checklist
"The ultimate {topic} checklist"
6–8 checkbox items
Free download CTA

DESIGN 8 — Comparison
"X vs Y: which is right for you?"
Two columns with key points
Bottom verdict

DESIGN 9 — Calendar/Planner
Monthly grid with content prompts
Branded color scheme
"Save this for later"

DESIGN 10 — Resource Bundle
"Free {asset} pack"
Mockup of the resource
Big CTA button

DESIGN 11 — Tutorial Thumbnail
Step 1 photo, large
Title overlay
"Tutorial inside ↓"

DESIGN 12 — Story Format
3 vertical panels
Beginning → middle → end teaser
"Read the full story ↓"

DESIGN 13 — Stats Card
1 huge number
Context line below
Source citation

DESIGN 14 — Tool Roundup
"Best {tools} for {use case}"
Logo grid 2x3
"Full breakdown →"

DESIGN 15 — Recipe Card
Hero photo, top half
Ingredients list, bottom
Time/yield info

DESIGN 16 — DIY Project
Final result photo
Materials needed sidebar
"Full tutorial ↓"

DESIGN 17 — Mood Board
4-photo collage
Title overlay
Genre/theme label

DESIGN 18 — FAQ
"Everything you need to know about {topic}"
3 question previews
"Full guide →"

DESIGN 19 — Product Showcase
Product on neutral background
Key benefits list
Price + CTA

DESIGN 20 — Testimonial Pin
Customer photo (with permission)
Pull quote
Star rating + name


TITLE FORMULA (60 chars max, keyword-front-loaded)
-------------------------------------------------
[Primary keyword] + [benefit] + [year/qualifier]

Examples:
- "Small Business Marketing Tips That Actually Work in 2026"
- "Easy Email Templates for Local Service Businesses"
- "Free Instagram Content Calendar for Cafes"


DESCRIPTION FORMULA (500 chars, 3-5 hashtags max)
-------------------------------------------------
[Hook sentence with primary keyword]
[2-3 sentences expanding on what they'll learn]
[CTA to click]
[3-5 relevant hashtags]

Example:
"Trying to grow your Etsy shop on Pinterest? These 7 proven pin templates helped me 3x my monthly Etsy sales without paid ads. Includes free Canva templates, SEO checklist, and pin scheduling tips. Click to read the full guide. #etsyshop #pinteresttips #handmadebusiness #etsyseller #smallbusinessmarketing"


BOARD STRUCTURE (start with 5)
-----------------------------
Board 1: {your_brand} — your own products/blog
Board 2: {primary_topic} tips — broad evergreen
Board 3: {secondary_topic} ideas — long-tail
Board 4: {audience} resources — community appeal
Board 5: {seasonal/timely} — refresh quarterly


PINTEREST SEO KEYWORD RESEARCH
------------------------------
1. Type your topic into Pinterest search bar
2. Note the autocomplete suggestions
3. Note the colored bubble keywords below the search results
4. Use those exact phrases in your pin titles and descriptions
5. Rotate keywords across pins — don't keyword-stuff one pin


90-DAY POSTING CALENDAR
-----------------------
Week 1: Post 3 fresh pins/day from existing content
Week 2: Add 2 new designs per existing post
Week 3-12: Schedule 3 pins/day, mixing evergreen + new
Saturdays: Review top 5 pins, make 5 design variations of each


ANALYTICS REVIEW (Monthly)
--------------------------
- Top 10 pins by outbound clicks (not impressions)
- Which boards drive most traffic
- Which keywords show up in your top pins
- Refresh design on bottom 20% of pins
`,
  },
  {
    slug: "small-business-marketing-plan-template",
    title: "Small Business Marketing Plan Template",
    category: "strategy",
    categoryLabel: "Strategy",
    description:
      "One-page annual marketing plan template that fits on a single sheet — goals, audiences, channels, budget, calendar.",
    whatsInside: [
      "Annual goals worksheet (SMART format)",
      "Audience persona summary (top 3)",
      "Channel mix recommendation by industry",
      "Quarterly budget breakdown",
      "12-month content calendar skeleton",
      "KPI tracking template",
      "Monthly review checklist",
    ],
    howToUse: [
      "Fill in the goals first — everything downstream depends on them. Be ruthlessly specific.",
      "Build the channel mix to match where your audience actually is, not where you wish they were.",
      "Review the plan monthly, revise quarterly. Annual plans you never look at are useless.",
    ],
    why: "Most small business marketing fails because there's no plan — just reactive posting. A one-page plan you actually use beats a 30-page plan that sits on a shelf. The structure here is borrowed from a strategy used by 100+ Social Perks customers averaging $500K–$5M in revenue.",
    content: `SMALL BUSINESS MARKETING PLAN — ONE-PAGE TEMPLATE
==================================================

BUSINESS: ____________________
YEAR: ________
LAST UPDATED: ________

1. ANNUAL GOALS (Pick 3 — no more)
----------------------------------
Goal 1: _______________________________________________
   Metric: _______________   Target: _______________
Goal 2: _______________________________________________
   Metric: _______________   Target: _______________
Goal 3: _______________________________________________
   Metric: _______________   Target: _______________


2. AUDIENCE — TOP 3 SEGMENTS
----------------------------
Segment A: ________________ (% of revenue: ___)
   Where they spend time: _____________________________
   Top pain point: ____________________________________
   Top desire: ________________________________________

Segment B: ________________ (% of revenue: ___)
   Where they spend time: _____________________________
   Top pain point: ____________________________________
   Top desire: ________________________________________

Segment C: ________________ (% of revenue: ___)
   Where they spend time: _____________________________
   Top pain point: ____________________________________
   Top desire: ________________________________________


3. CHANNEL MIX (% of budget + time)
-----------------------------------
SEO / blog ......................... ___% / ___ hrs/wk
Email marketing .................... ___% / ___ hrs/wk
Social organic (IG/TikTok/LI) ...... ___% / ___ hrs/wk
Paid ads (Meta / Google) ........... ___% / ___ hrs/wk
Influencer / UGC ................... ___% / ___ hrs/wk
Referral / perks program ........... ___% / ___ hrs/wk
Events / partnerships .............. ___% / ___ hrs/wk
                                    --------
                                     100%


4. BUDGET (Quarterly)
---------------------
Q1: $________   Q2: $________   Q3: $________   Q4: $________
ANNUAL TOTAL: $________

Rule of thumb: 7–12% of revenue for growth-stage, 3–5% for mature.


5. 12-MONTH CONTENT CALENDAR (Themes)
-------------------------------------
Jan: _______________   Feb: _______________   Mar: _______________
Apr: _______________   May: _______________   Jun: _______________
Jul: _______________   Aug: _______________   Sep: _______________
Oct: _______________   Nov: _______________   Dec: _______________


6. KPI DASHBOARD (Track Monthly)
--------------------------------
Website traffic: ___________
Email list size: ___________
Social followers: ___________
New customers: ___________
Customer acquisition cost: ___________
Customer lifetime value: ___________
Repeat purchase rate: ___________
NPS / review score: ___________


7. MONTHLY REVIEW (15 min, first Monday)
----------------------------------------
[ ] Did we hit last month's targets?
[ ] What's driving the wins?
[ ] What's broken? What do we stop?
[ ] Adjust next month's priorities
[ ] Update KPI dashboard


COMMON CHANNEL MIX BY BUSINESS TYPE
-----------------------------------
LOCAL SERVICE (HVAC, plumbing, dentist):
- 35% Google Ads + GBP
- 25% SEO/content
- 20% referral
- 15% email
- 5% social

E-COMMERCE / DTC:
- 35% Meta + TikTok ads
- 20% email
- 15% influencer/UGC
- 15% SEO
- 10% organic social
- 5% referral

B2B SAAS / AGENCY:
- 30% SEO/content
- 25% LinkedIn organic
- 20% email
- 15% paid (LI + Google)
- 10% partnerships

CAFE / RESTAURANT:
- 30% Instagram organic
- 25% GBP + local SEO
- 20% perks/loyalty
- 15% events
- 10% influencer
`,
  },
  {
    slug: "customer-persona-template",
    title: "Customer Persona Template",
    category: "strategy",
    categoryLabel: "Strategy",
    description:
      "Build 1–3 sharp customer personas based on real data — not fiction. Includes interview script and synthesis worksheet.",
    whatsInside: [
      "Persona one-pager (printable)",
      "Customer interview script (10 questions)",
      "Data sources checklist",
      "Synthesis worksheet for raw notes",
      "Jobs-to-be-done framework",
      "Anti-persona section (who NOT to target)",
      "Use cases by team (sales, product, marketing)",
    ],
    howToUse: [
      "Interview 5–8 actual customers before writing a single persona. Skip this and you'll write fiction.",
      "Fill out one persona per major customer segment (most businesses need only 1–3, not 7).",
      "Print and pin in your workspace. Reference when writing copy or making product decisions.",
    ],
    why: "Personas based on guesses lead to marketing that lands nowhere. Personas based on 5–8 real interviews lead to copy that makes customers say 'this is for me.' The difference is the work upfront.",
    content: `CUSTOMER PERSONA TEMPLATE
==========================

PART 1: INTERVIEW SCRIPT
========================

Use this exact script with 5–8 of your best customers. Record (with permission) and transcribe.

OPENING (1 min):
"Thanks for taking the time. I'm trying to understand customers like you better so we can build a better experience. There are no right answers — just want your honest perspective. About 20 minutes. Ok to record?"

QUESTIONS:

1. Walk me through the day you first realized you needed something like {your_product/service}. What was happening?

2. Before you found us, what were you using or doing instead?

3. What made you finally start looking for a solution?

4. How did you find us specifically?

5. What other options did you compare us to? Why did you choose us?

6. What were you most worried about before you bought?

7. What's the best part of using {product/service} for you?

8. If you had to describe what we do to a colleague in one sentence, what would you say?

9. What's one thing we could improve?

10. Who else in your life would benefit from this? Why them?

CLOSING:
"Last question — anything I didn't ask that you wish I had?"


PART 2: PERSONA ONE-PAGER
==========================

NAME: ______________________ (give them a name; makes it real)
ROLE/LIFE STAGE: ______________________
LOCATION: ______________________
AGE RANGE: ______________________
INCOME / BUSINESS SIZE: ______________________

----

A DAY IN THEIR LIFE
[2-3 sentences. Wake up, work, evening. Be specific.]

----

THEIR GOALS
1. ________________________________________
2. ________________________________________
3. ________________________________________

THEIR PAINS
1. ________________________________________
2. ________________________________________
3. ________________________________________

----

JOBS TO BE DONE
"When I _______, I want to _______, so I can _______."

Example: "When I close a sale, I want to remember to ask for a review without it feeling pushy, so I can build my reputation without burning the relationship."

----

INFORMATION DIET
Where they learn:
- Podcasts: ______________________________
- YouTube channels: ______________________
- Newsletters: ___________________________
- Communities: __________________________
- Influencers they follow: ______________

----

OBJECTIONS
1. "I'm worried that ______________________"
2. "What if ______________________________"
3. "I tried something like this before and ___________"

----

DECISION TRIGGERS
What makes them act now?
- ________________________________________
- ________________________________________
- ________________________________________

----

QUOTE (verbatim from interview)
"________________________________________
________________________________________
________________________________________"


PART 3: ANTI-PERSONA
====================

WHO IS THIS NOT FOR?
[List the type of customer you should turn away. Saves money and time.]

- ________________________________________
- ________________________________________
- ________________________________________


PART 4: TEAM USE CASES
=======================

MARKETING: Use the JTBD line in headlines and ad copy.
SALES: Reference the objections in discovery calls.
PRODUCT: Prioritize features that solve the top 2 pains.
SUPPORT: Recognize this persona's tone in tickets.
`,
  },
  {
    slug: "competitive-analysis-template",
    title: "Competitive Analysis Template",
    category: "strategy",
    categoryLabel: "Strategy",
    description:
      "Compare your business against 3–5 competitors on positioning, pricing, channels, and customer experience. Find the gap.",
    whatsInside: [
      "Competitor matrix (8 evaluation criteria)",
      "Positioning canvas",
      "Pricing comparison worksheet",
      "Channel presence audit",
      "Customer review analysis prompt",
      "Gap-finding framework",
      "Quarterly refresh checklist",
    ],
    howToUse: [
      "Pick 3–5 competitors — direct competitors (same product), indirect (different product, same need), and aspirational (where you want to be).",
      "Fill in the matrix in one sitting (2 hours). Don't overthink — your gut read is often correct.",
      "End with the gap statement: 'No one in this space is doing _____ — that's our opening.'",
    ],
    why: "Competitive analysis isn't about copying. It's about finding the space no one is occupying. Most small businesses skip this and end up sounding identical to 12 other shops on the same block. A 2-hour analysis can reshape your entire positioning.",
    content: `COMPETITIVE ANALYSIS TEMPLATE
==============================

STEP 1: PICK YOUR COMPETITORS
-----------------------------
Direct (same offer to same audience):
1. ________________________________________
2. ________________________________________

Indirect (different offer, same need):
3. ________________________________________
4. ________________________________________

Aspirational (where you want to be in 3 years):
5. ________________________________________


STEP 2: COMPETITOR MATRIX
=========================

Fill in for each competitor:

CRITERIA              | COMP 1 | COMP 2 | COMP 3 | COMP 4 | COMP 5 | YOU
--------------------- | ------ | ------ | ------ | ------ | ------ | ----
Positioning (1 line)  |        |        |        |        |        |
Price (entry tier)    |        |        |        |        |        |
Price (top tier)      |        |        |        |        |        |
Target customer       |        |        |        |        |        |
Top channel           |        |        |        |        |        |
Followers (IG)        |        |        |        |        |        |
Followers (TikTok)    |        |        |        |        |        |
Google review count   |        |        |        |        |        |
Google rating         |        |        |        |        |        |
Unique strength       |        |        |        |        |        |
Weakness (visible)    |        |        |        |        |        |


STEP 3: POSITIONING CANVAS
==========================

Plot each competitor on these 2 axes:

VERTICAL: PRICE (low → high)
HORIZONTAL: SERVICE LEVEL (DIY → full-service)

         HIGH PRICE
            │
            │
DIY ────────┼──────── FULL-SERVICE
            │
            │
         LOW PRICE

Where do you fit? Where is the empty quadrant?
________________________________________
________________________________________


STEP 4: CUSTOMER REVIEW ANALYSIS
================================

For each competitor, read their last 30 Google reviews. Note:

COMPETITOR 1:
Common praise: ______________________________________
Common complaints: __________________________________
Words used 3+ times: ________________________________

COMPETITOR 2:
Common praise: ______________________________________
Common complaints: __________________________________
Words used 3+ times: ________________________________

[Repeat for all]

KEY INSIGHT: What complaint shows up in 3+ competitor reviews? That's your opening.
________________________________________


STEP 5: GAP STATEMENT
=====================

Complete these sentences:

"All of our competitors do _____ well, but none of them do _____."

"Our customers consistently complain about _____ in other brands."

"If I had to start a new business in this space, I'd compete on _____."


STEP 6: ACTION PLAN
===================

Based on the analysis, in the next 90 days we will:

1. CLAIM: Reposition our messaging to emphasize ____________________
2. ATTACK: Out-execute competitors on ____________________________
3. AVOID: Stop competing on _____________ (we'll never win)
4. WATCH: Monitor competitor _____ for ___________________


QUARTERLY REFRESH CHECKLIST
---------------------------
[ ] New competitors entered the market?
[ ] Anyone pivoted positioning?
[ ] Pricing changes?
[ ] New channels emerging?
[ ] Customer review themes shifting?
`,
  },
  {
    slug: "swot-analysis-template",
    title: "SWOT Analysis Template",
    category: "strategy",
    categoryLabel: "Strategy",
    description:
      "The classic strengths/weaknesses/opportunities/threats framework — modernized for small businesses and used in a single workshop.",
    whatsInside: [
      "SWOT 2x2 grid (printable)",
      "Prompting questions for each quadrant",
      "Strategy mapping worksheet (SO/WO/ST/WT)",
      "Voting and prioritization template",
      "90-day action plan output",
      "Common pitfalls and how to avoid them",
      "Facilitator notes for team sessions",
    ],
    howToUse: [
      "Block 90 minutes. Solo or with up to 5 team members.",
      "Brainstorm each quadrant for 15 minutes — quantity over quality first, refine after.",
      "End with 3 specific actions that fall out of the analysis. SWOT without action is just a wall of sticky notes.",
    ],
    why: "SWOT gets a bad rap because most people stop at the grid. The value is in the cross-mapping — pairing strengths with opportunities to find your best bets, and weaknesses with threats to find your real risks. This template forces that step.",
    content: `SWOT ANALYSIS TEMPLATE
=======================

PART 1: THE 2x2 GRID
====================

                INTERNAL
                ┌──────────────────────────┐
                │       STRENGTHS          │
                │  (Things you do well)    │
                │  1. ___________________  │
                │  2. ___________________  │
                │  3. ___________________  │
POSITIVE  ──────┤  4. ___________________  ├──── INTERNAL
                │  5. ___________________  │
                ├──────────────────────────┤
                │      OPPORTUNITIES       │
                │ (External tailwinds)     │
                │  1. ___________________  │
                │  2. ___________________  │
                │  3. ___________________  │
                │  4. ___________________  │
                │  5. ___________________  │
                └──────────────────────────┘
                        EXTERNAL

                INTERNAL
                ┌──────────────────────────┐
                │      WEAKNESSES          │
                │  (Things you lack/lose)  │
                │  1. ___________________  │
                │  2. ___________________  │
NEGATIVE  ──────┤  3. ___________________  ├──── INTERNAL
                │  4. ___________________  │
                │  5. ___________________  │
                ├──────────────────────────┤
                │       THREATS            │
                │ (External headwinds)     │
                │  1. ___________________  │
                │  2. ___________________  │
                │  3. ___________________  │
                │  4. ___________________  │
                │  5. ___________________  │
                └──────────────────────────┘
                        EXTERNAL


PART 2: PROMPTING QUESTIONS
===========================

STRENGTHS (look inward):
- What do we do better than competitors?
- What unique skills or assets do we have?
- What do customers consistently praise?
- What part of our business runs smoothly without effort?
- What would competitors steal from us if they could?

WEAKNESSES (look inward, honestly):
- Where do we lose deals?
- What do customers complain about?
- What part of operations breaks repeatedly?
- Where are we under-skilled or under-resourced?
- What do we avoid talking about?

OPPORTUNITIES (look outward):
- What's changing in our industry that helps us?
- What customer needs are unmet by competitors?
- What new channels, tools, or partnerships could we leverage?
- What's happening economically/socially that creates demand?
- Who's leaving the market and why?

THREATS (look outward):
- Who are the new entrants?
- What's changing in customer behavior?
- What regulations or platform changes could hurt us?
- What economic trends are unfavorable?
- What's our biggest dependency we can't control?


PART 3: CROSS-MAP (where the real strategy lives)
=================================================

SO STRATEGIES (Strengths + Opportunities) — Your offensive plays:
"Use [strength] to capture [opportunity]"
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

WO STRATEGIES (Weaknesses + Opportunities) — What to fix to capture upside:
"Address [weakness] so we can pursue [opportunity]"
1. _______________________________________________
2. _______________________________________________

ST STRATEGIES (Strengths + Threats) — Your defensive plays:
"Use [strength] to mitigate [threat]"
1. _______________________________________________
2. _______________________________________________

WT STRATEGIES (Weaknesses + Threats) — What to defend or exit:
"Reduce exposure to [weakness] before [threat] hits"
1. _______________________________________________
2. _______________________________________________


PART 4: VOTING (if team session)
================================

Each person gets 3 votes. Place across all 4 strategy quadrants. Top-3 vote-getters become priorities.


PART 5: 90-DAY ACTION PLAN
==========================

Priority 1: _______________________________________________
   Owner: _________   Deadline: _________   Success metric: _________

Priority 2: _______________________________________________
   Owner: _________   Deadline: _________   Success metric: _________

Priority 3: _______________________________________________
   Owner: _________   Deadline: _________   Success metric: _________


COMMON PITFALLS
---------------
- Listing too many items per quadrant — force-rank top 5
- Confusing internal vs external (a competitor is external; your slow website is internal)
- Stopping at the grid — the cross-map is where decisions get made
- Doing SWOT once and never revisiting — schedule quarterly
- Not assigning owners to actions — the analysis dies
`,
  },
  {
    slug: "marketing-budget-template",
    title: "Marketing Budget Template",
    category: "strategy",
    categoryLabel: "Strategy",
    description:
      "Annual marketing budget template broken into channels, with formulas for ROI, CAC, and payback period built in.",
    whatsInside: [
      "Annual budget allocator (8 channels)",
      "Monthly burn-down tracker",
      "CAC, LTV, payback formulas",
      "Test budget guidelines (5–10% of total)",
      "Channel benchmark library",
      "Reforecast template (mid-year)",
      "Justification deck structure for buy-in",
    ],
    howToUse: [
      "Start with revenue target backwards: revenue × 7–12% = your marketing budget for growth-stage businesses.",
      "Reserve 5–10% as a 'test budget' for new channels. The rest goes to proven channels.",
      "Update the actual spend column monthly. Quarterly, compare to plan and reforecast.",
    ],
    why: "Most small business marketing budgets are made up in January and forgotten by March. This template builds in the monthly cadence that keeps spending honest and ROI calculable. Without it, you can't tell whether you're winning or just spending.",
    content: `MARKETING BUDGET TEMPLATE — ANNUAL
====================================

REVENUE TARGET FOR YEAR: $____________
% OF REVENUE TO MARKETING: ____% (typically 7–12% for growth, 3–5% for mature)
TOTAL MARKETING BUDGET: $____________


PART 1: CHANNEL ALLOCATION
==========================

CHANNEL                    | ANNUAL  | MONTHLY | % MIX
-------------------------- | ------- | ------- | -----
SEO / blog content         | $______ | $______ | ___%
Email marketing            | $______ | $______ | ___%
Paid social (Meta/TikTok)  | $______ | $______ | ___%
Paid search (Google)       | $______ | $______ | ___%
Influencer / creator       | $______ | $______ | ___%
Referral / perks program   | $______ | $______ | ___%
Events / sponsorships      | $______ | $______ | ___%
Tools / software           | $______ | $______ | ___%
TEST BUDGET (new channels) | $______ | $______ | ___%
                            ------- | ------- | -----
TOTAL                      | $______ | $______ | 100%


PART 2: MONTHLY BURN-DOWN TRACKER
=================================

MONTH | PLAN $ | ACTUAL $ | VARIANCE | NEW CUSTOMERS | CAC
----- | ------ | -------- | -------- | ------------- | ---
Jan   | $_____ | $______  | $______  | _____         | $___
Feb   | $_____ | $______  | $______  | _____         | $___
Mar   | $_____ | $______  | $______  | _____         | $___
Apr   | $_____ | $______  | $______  | _____         | $___
May   | $_____ | $______  | $______  | _____         | $___
Jun   | $_____ | $______  | $______  | _____         | $___
Jul   | $_____ | $______  | $______  | _____         | $___
Aug   | $_____ | $______  | $______  | _____         | $___
Sep   | $_____ | $______  | $______  | _____         | $___
Oct   | $_____ | $______  | $______  | _____         | $___
Nov   | $_____ | $______  | $______  | _____         | $___
Dec   | $_____ | $______  | $______  | _____         | $___


PART 3: KEY FORMULAS
====================

CUSTOMER ACQUISITION COST (CAC):
   Total marketing spend / New customers acquired
   = $_______ / _______ = $_______

CUSTOMER LIFETIME VALUE (LTV):
   Average order value × Purchase frequency × Lifespan years
   = $_____ × _____ × _____ years = $_____

LTV:CAC RATIO (target: 3:1 or higher):
   LTV / CAC = ___ : 1

PAYBACK PERIOD (target: under 12 months):
   CAC / Gross monthly profit per customer = ___ months

RETURN ON AD SPEND (ROAS):
   Revenue from ads / Ad spend = ___x


PART 4: CHANNEL BENCHMARKS
==========================

CHANNEL          | TYPICAL CAC | TYPICAL ROAS | NOTES
---------------- | ----------- | ------------ | --------
Google search    | $20–80      | 3–6x         | Best for high-intent
Meta ads         | $15–60      | 2–4x         | Best for visual/DTC
TikTok ads       | $10–40      | 1.5–3x       | Best for under-35
Email            | $5–15       | 8–12x        | Best ROI channel
SEO              | $20–50      | 5–10x        | Slowest, highest LTV
Influencer       | $30–120     | 1.5–4x       | Wide variance
Referral / perks | $5–20       | 5–15x        | Best for repeat biz


PART 5: TEST BUDGET RULES
=========================

Allocate 5–10% of total budget for experiments.

Rules:
1. Single test = $500–$2,000 max
2. Run for at least 4 weeks (less = no signal)
3. Define success metric BEFORE launch
4. If it works → graduate to main budget next quarter
5. If it doesn't → kill, document why, move on


PART 6: MID-YEAR REFORECAST (July)
==================================

What's working (move budget toward):
1. _______________________________________________
2. _______________________________________________

What's underperforming (cut or reallocate):
1. _______________________________________________
2. _______________________________________________

Revised H2 channel mix:
[Recreate Part 1 with new numbers]


PART 7: JUSTIFICATION DECK (for getting sign-off)
=================================================

Slide 1: Last year recap — what worked, what didn't
Slide 2: Revenue target for the year + what it requires
Slide 3: % to marketing benchmark vs. peer companies
Slide 4: Channel mix and rationale
Slide 5: CAC, LTV, payback projections
Slide 6: Test budget — what we're betting on
Slide 7: Monthly cadence + accountability
Slide 8: Asks (budget, headcount, tools)
`,
  },
  {
    slug: "customer-journey-map-template",
    title: "Customer Journey Map Template",
    category: "operational",
    categoryLabel: "Operational",
    description:
      "Map every touchpoint a customer has with your business — awareness to advocacy — and find the friction killing conversion.",
    whatsInside: [
      "5-stage journey map template",
      "Touchpoint inventory worksheet",
      "Emotion curve overlay",
      "Friction-spotting checklist",
      "Owner assignment per stage",
      "Quick-win prioritization grid",
      "Quarterly journey audit calendar",
    ],
    howToUse: [
      "Pick one persona and one journey (e.g., 'first-time buyer'). Don't try to map everything.",
      "Walk through it as the customer — actually buy your own product, sign up for your own newsletter. Note every friction point.",
      "Score each touchpoint on a 1–5 emotion scale. Drops below 3 are where you lose customers.",
    ],
    why: "Most businesses optimize touchpoints in isolation — a better landing page, a cleaner checkout. Journey maps reveal that the real problem is often the gap BETWEEN touchpoints (waiting for an email, no onboarding after purchase). Fix the gaps, not just the screens.",
    content: `CUSTOMER JOURNEY MAP TEMPLATE
==============================

PERSONA: ____________________
JOURNEY: ____________________
DATE: ________

STAGE 1: AWARENESS
==================
How they first hear about you.

TOUCHPOINTS:
- _______________________________
- _______________________________
- _______________________________

THEIR GOAL: _______________________________
THEIR EMOTION (1-5): ___
FRICTION POINTS: ________________________
OWNER: ____________


STAGE 2: CONSIDERATION
======================
They're evaluating you vs. alternatives.

TOUCHPOINTS:
- _______________________________
- _______________________________
- _______________________________

THEIR GOAL: _______________________________
THEIR EMOTION (1-5): ___
FRICTION POINTS: ________________________
OWNER: ____________


STAGE 3: PURCHASE
=================
They decide and buy.

TOUCHPOINTS:
- _______________________________
- _______________________________
- _______________________________

THEIR GOAL: _______________________________
THEIR EMOTION (1-5): ___
FRICTION POINTS: ________________________
OWNER: ____________


STAGE 4: USE / ONBOARDING
=========================
First experience after the sale.

TOUCHPOINTS:
- _______________________________
- _______________________________
- _______________________________

THEIR GOAL: _______________________________
THEIR EMOTION (1-5): ___
FRICTION POINTS: ________________________
OWNER: ____________


STAGE 5: ADVOCACY
=================
They love it enough to tell others.

TOUCHPOINTS:
- _______________________________
- _______________________________
- _______________________________

THEIR GOAL: _______________________________
THEIR EMOTION (1-5): ___
FRICTION POINTS: ________________________
OWNER: ____________


EMOTION CURVE
=============

5 ┤                                              ●
4 ┤    ●                              ●
3 ┤●           ●         ●
2 ┤
1 ┤
  └─────┬──────┬──────┬──────┬──────┬─────
       AWARE  CONSID  PURCH  USE   ADVOC

Where does the curve dip? That's your priority.


FRICTION CHECKLIST (per stage)
------------------------------
[ ] Took too many clicks/steps
[ ] Required info they didn't have
[ ] No confirmation it worked
[ ] Wait time between actions
[ ] Inconsistent tone vs. previous touchpoint
[ ] Mobile experience broken
[ ] Unclear next step
[ ] Forced to repeat information
[ ] Hidden costs revealed late
[ ] No human help available


QUICK-WIN GRID
==============

Score each friction point on Impact (1-5) and Effort (1-5).

HIGH IMPACT, LOW EFFORT: Do this month
HIGH IMPACT, HIGH EFFORT: Plan for this quarter
LOW IMPACT, LOW EFFORT: Batch for a "polish week"
LOW IMPACT, HIGH EFFORT: Ignore


QUARTERLY AUDIT
---------------
Once per quarter, walk through the journey again. Did anything degrade? Did fixes hold?
`,
  },
  {
    slug: "ugc-rights-release-template",
    title: "UGC Rights Release Template",
    category: "operational",
    categoryLabel: "Operational",
    description:
      "Plain-language UGC content rights release for using customer photos and videos in your marketing — without legal trouble.",
    whatsInside: [
      "Short-form DM/email request template",
      "Long-form rights release agreement",
      "Comment reply scripts (Instagram, TikTok)",
      "Compensation tiers (free, gifted, paid)",
      "What rights to ask for (and what to skip)",
      "Record-keeping template",
      "FTC disclosure requirements summary",
    ],
    howToUse: [
      "For organic reposts: use the short-form DM/email and get written 'yes' before reposting.",
      "For ads or large-scale use: use the long-form release — verbal yes is not enough.",
      "Store every release with the content URL in a spreadsheet. If it's ever challenged, you'll need proof.",
    ],
    why: "Customer photos and videos are gold for marketing — and a lawsuit waiting to happen if you use them without permission. This template gives you the language to ask, the rights to request, and the records to defend yourself. Not legal advice, but a working starting point.",
    content: `UGC RIGHTS RELEASE TEMPLATE
============================

DISCLAIMER: This is a working template, not legal advice. For high-stakes use (national ad campaigns, billboards, paid ads with substantial spend) consult a media-rights attorney.


SHORT-FORM REQUEST (for DMs and email)
======================================

Hi {first_name}!

We loved the post you shared featuring {our_product}. Would you be willing to let us share it on our {channels — e.g., Instagram, website, email}? We'd credit you and tag @{your_handle}.

Just reply "yes" and we'll go from there. Thanks for being a customer!

— {your_name}, {business_name}


COMMENT REPLY (Instagram/TikTok)
================================

"Love this! Mind if we repost on our {Instagram/TikTok} with full credit to @{their_handle}? Just reply 'yes' if so 🙌"


LONG-FORM RIGHTS RELEASE (use for ads, larger campaigns)
=========================================================

CONTENT RIGHTS RELEASE

Date: ____________

Creator (Releasor): _______________________________
   Email: _______________________________
   Social handle: _______________________________

Company (Releasee): _______________________________

CONTENT BEING LICENSED:
URL or description of content: _______________________________
Created on: _______________________________

GRANT OF RIGHTS:
Creator grants Company a [perpetual / 1-year / 2-year — circle one] non-exclusive, worldwide, royalty-free license to use, reproduce, modify, distribute, and display the Content for:
[ ] Organic social media posts
[ ] Paid social media ads
[ ] Website and landing pages
[ ] Email marketing
[ ] Print materials
[ ] Other: _______________________________

NAME, LIKENESS, VOICE:
Creator agrees that the Content may include their name, likeness, and voice, and consents to such use.

ATTRIBUTION:
Company agrees to:
[ ] Credit @{handle} when posting on social
[ ] No attribution required
[ ] Custom: _______________________________

COMPENSATION:
[ ] No compensation — gifted product / brand love
[ ] Product valued at $______
[ ] Cash payment of $______
[ ] Discount code: ______ valued at $______

REPRESENTATIONS:
Creator represents that:
- They are the original creator of the Content
- They have rights to grant this license
- The Content does not infringe any third party's rights
- They are 18 years or older

SIGNED:

Creator: _______________________________   Date: __________

Company representative: _______________________________   Date: __________


WHAT RIGHTS TO ASK FOR
======================

ALWAYS ask for:
- Right to repost on social
- Right to display on your website
- Right to use creator's handle for credit

ASK SEPARATELY (worth more $):
- Right to use in paid ads
- Right to modify (crop, edit, add text overlay)
- Right to use across multiple geographies
- Perpetual term (vs. 1-year)

DON'T ASK FOR (unless paying real money):
- Exclusive rights
- Right to sub-license to third parties
- Transfer of ownership


COMPENSATION TIERS
==================

TIER 1 — GIFTED: Free repost rights in exchange for a product gift or shoutout. Works for: micro-influencers and happy customers.

TIER 2 — DISCOUNT: $25–$100 credit code for repost rights. Works for: regulars with engaged audiences.

TIER 3 — PAID ORGANIC: $50–$500 cash for repost + organic use. Works for: nano/micro creators.

TIER 4 — PAID ADS: $200–$2,500 cash for full ad usage rights. Works for: established creators with proven content.


RECORD-KEEPING TEMPLATE
=======================

Maintain a spreadsheet with:
- Creator name + handle
- Content URL
- Date of release
- Rights granted
- Compensation given
- Expiration date (if any)
- Link to signed release


FTC DISCLOSURE
==============

If you compensate a creator (cash, free product valued over ~$25, or any material benefit), the post they make must include:
- #ad or #sponsored
- "Paid partnership with @{your_brand}" tag where supported
- Clear and conspicuous (not buried in hashtags)

You as the brand can also be liable for non-disclosure. Build a disclosure brief into your contract.
`,
  },
  {
    slug: "influencer-contract-template",
    title: "Influencer Contract Template",
    category: "operational",
    categoryLabel: "Operational",
    description:
      "Plain-language influencer agreement covering deliverables, timeline, compensation, usage rights, and FTC compliance.",
    whatsInside: [
      "Full contract template (editable sections)",
      "Deliverables specification worksheet",
      "Payment terms (net 30, milestones, etc.)",
      "Exclusivity and competing brand clauses",
      "Content approval workflow",
      "Kill fees and termination clauses",
      "FTC compliance addendum",
    ],
    howToUse: [
      "Customize the bracketed sections — never use any template raw.",
      "Always agree on deliverables in writing before any payment changes hands.",
      "Build a content approval step (24–48 hours) before posting. Protects both sides.",
    ],
    why: "Most influencer deals go sideways because nothing was written down. Contracts protect you AND the creator. A clear contract covers expectations, payment timing, and what happens when things go wrong — preventing 90% of disputes.",
    content: `INFLUENCER COLLABORATION AGREEMENT
===================================

DISCLAIMER: Working template, not legal advice. Consult an attorney for high-value deals (>$10K).

DATE: ____________
BRAND: _______________________________ ("Brand")
CREATOR: _______________________________ ("Creator")
CAMPAIGN: _______________________________


1. DELIVERABLES
---------------
Creator agrees to produce and publish:

[ ] ___ Instagram feed posts
[ ] ___ Instagram Reels
[ ] ___ Instagram Stories (___ frames each)
[ ] ___ TikTok videos
[ ] ___ YouTube videos / Shorts
[ ] ___ Blog posts
[ ] ___ Other: _______________________________

REQUIRED CONTENT ELEMENTS:
- Hashtags to include: #__________ #__________ #__________
- Tag: @{brand_handle}
- Mention: {key_message_or_offer}
- Avoid: {brand_no_go_topics}

CONTENT SPECIFICATIONS:
- Length: _______________________________
- Visual style: _______________________________
- Product placement: _______________________________


2. TIMELINE
-----------
Campaign briefing: ____________
First draft due: ____________
Brand approval window: 48 hours
Revisions due: ____________
Publishing date(s): ____________


3. COMPENSATION
---------------
Total compensation: $____________
[ ] Plus product valued at $____________

Payment schedule:
[ ] 50% on signing, 50% on publication
[ ] 100% net 30 from publication
[ ] Custom: _______________________________

Payment method: _______________________________


4. USAGE RIGHTS
---------------
Brand may use Content for:
[ ] Organic social (perpetual)
[ ] Paid social ads (___ months)
[ ] Brand website (perpetual)
[ ] Email marketing (perpetual)
[ ] Out-of-home / print (___ months)

Exclusivity: Creator agrees NOT to promote {competitor categories} for ___ days from publication date.


5. CONTENT APPROVAL
-------------------
Creator will submit draft content for Brand review at least 48 hours before publication. Brand may request reasonable revisions (max ___ rounds). Creator retains final editorial control over voice and style. Brand has final approval over use of brand assets and messaging.


6. FTC COMPLIANCE
-----------------
Creator agrees to comply with FTC endorsement guidelines:
- Include #ad or #sponsored in caption (not buried in hashtags)
- Use "Paid partnership with @{brand}" tag where platform supports
- Disclosure must appear ABOVE the fold / before "see more"
- Verbal disclosure required in video content within first 30 seconds


7. PERFORMANCE EXPECTATIONS
---------------------------
Creator's current audience metrics (snapshot at contract date):
- Followers: ____________
- Average engagement rate: ____________
- Average post reach: ____________

While specific performance is not guaranteed, significant deviation (>50%) from these metrics may trigger a good-faith conversation.


8. KILL FEE
-----------
If Brand cancels after Creator has begun production but before publication: Brand pays ___% of total fee.
If Creator cancels for reasons other than Brand breach: Creator returns any payment received.


9. TERMINATION
--------------
Either party may terminate immediately if:
- The other party materially breaches this agreement
- Bankruptcy or insolvency
- Conduct that materially damages the other's reputation

Upon termination, all unpublished content reverts to Creator; all published content remains licensed per Section 4.


10. REPRESENTATIONS
-------------------
Creator represents:
- They are 18+
- All content is original and does not infringe third-party rights
- They will not make false claims about Brand products
- They will accurately describe their genuine experience

Brand represents:
- They have authority to enter this agreement
- All product claims provided to Creator are truthful and substantiated


11. INDEMNIFICATION
-------------------
Each party will indemnify the other against claims arising from the indemnifying party's breach of representations or violation of law.


12. GOVERNING LAW
-----------------
This agreement is governed by the laws of {state/country}. Disputes resolved through {mediation/arbitration/court} in {jurisdiction}.


SIGNATURES:

Brand: _______________________________   Date: __________

Creator: _______________________________   Date: __________


CONTENT APPROVAL CHECKLIST (use per post)
-----------------------------------------
[ ] All required hashtags included
[ ] Brand handle tagged
[ ] FTC disclosure visible
[ ] No prohibited claims
[ ] Caption matches agreed messaging
[ ] Visual aligns with brief
[ ] Posted at agreed time
`,
  },
  {
    slug: "customer-feedback-survey-template",
    title: "Customer Feedback Survey Template",
    category: "operational",
    categoryLabel: "Operational",
    description:
      "Battle-tested customer survey with 8 questions that drive actionable insight — not vanity metrics.",
    whatsInside: [
      "8-question survey (5-min completion)",
      "NPS question with the correct wording",
      "Open-ended question prompts",
      "Distribution playbook (email, SMS, post-purchase)",
      "Response rate benchmarks by channel",
      "Analysis template (themes + verbatims)",
      "Action loop for closing feedback",
    ],
    howToUse: [
      "Send to customers 7–14 days after purchase or service. Earlier = no experience yet; later = memory fades.",
      "Keep to 8 questions max. Every additional question drops completion by 10–15%.",
      "Within 7 days of receiving feedback, reply personally to anyone who flagged an issue. Closes the loop.",
    ],
    why: "Most customer surveys are too long, ask the wrong questions, and never get acted on. This template asks the minimum questions that actually predict retention and referral, and includes the workflow to close the loop. Surveys without follow-up train customers to ignore your asks.",
    content: `CUSTOMER FEEDBACK SURVEY TEMPLATE
==================================

INTRODUCTION (top of survey)
----------------------------
Thanks for taking 5 minutes to share your thoughts. Your feedback genuinely shapes what we do next. We read every response.

— {owner_first_name}, {business_name}


QUESTION 1 — NPS (the gold standard)
------------------------------------
On a scale of 0 to 10, how likely are you to recommend {business_name} to a friend or colleague?
[ 0  1  2  3  4  5  6  7  8  9  10 ]

   0–6 = Detractor
   7–8 = Passive
   9–10 = Promoter


QUESTION 2 — Reason for score (open-ended)
------------------------------------------
What's the main reason for your score?
[Open text]


QUESTION 3 — Single biggest benefit
-----------------------------------
In one sentence, what's the single biggest benefit you've gotten from {business_name}?
[Open text]


QUESTION 4 — What almost stopped them
-------------------------------------
What was your biggest hesitation before buying — and what convinced you to go ahead?
[Open text]

(This is the gold question — surfaces real objections and what overcomes them. Use the answers in your sales copy.)


QUESTION 5 — Improvement
------------------------
What's one thing we could do better?
[Open text]


QUESTION 6 — Discovery
----------------------
How did you first hear about us?
[ ] Google search
[ ] Friend or colleague referral
[ ] Instagram
[ ] TikTok
[ ] Facebook
[ ] Podcast or YouTube
[ ] Newsletter / email
[ ] Other: ___________


QUESTION 7 — Demographics (1 question only)
-------------------------------------------
[Pick the ONE demographic question that matters most to your business]

Options:
- "What's your role at your company?"
- "How big is your team / business?"
- "What industry are you in?"
- "What's your age range?" (use sparingly)


QUESTION 8 — Permission
-----------------------
[ ] OK to share my feedback as a testimonial (with name + company)
[ ] OK to share anonymously
[ ] Please keep my feedback private


DISTRIBUTION PLAYBOOK
=====================

EMAIL (highest response, slowest):
- Subject: "Quick favor, {first_name}?"
- Send 7–14 days after purchase
- Expected response rate: 8–15%

POST-PURCHASE EMBED (highest velocity):
- Embed first 2 questions in your order confirmation page
- Expected response: 40–60% on Q1, dropping per question

SMS (fastest, lowest depth):
- Single NPS question only
- "Quick one — on 0-10, how likely are you to recommend us? Reply with the number 🙏"
- Expected response: 18–25%

IN-PERSON (richest, lowest scale):
- Owner conducts 1:1 30-min interviews quarterly
- Use questions 2, 3, 4, 5 verbally
- Record (with permission) and transcribe


ANALYSIS TEMPLATE
=================

After 30+ responses, run this analysis:

NPS SCORE:
% Promoters - % Detractors = NPS ___
Industry benchmark: ___

THEME EXTRACTION (Q2, Q3, Q5):
List the top 5 themes that appear 3+ times.

Theme 1: _______________________________ (___ mentions)
Theme 2: _______________________________ (___ mentions)
Theme 3: _______________________________ (___ mentions)
Theme 4: _______________________________ (___ mentions)
Theme 5: _______________________________ (___ mentions)

BEST VERBATIM QUOTES (for marketing use):
[List 5 best quotes you got permission to use]


CLOSING THE LOOP
================

DETRACTORS (0–6): Owner sends personal email within 7 days. Goal: understand and recover.

PASSIVES (7–8): Email with one targeted question: "What would have made this a 10?"

PROMOTERS (9–10): Thank-you email with referral link or review request. They're your best growth engine.


CADENCE
=======

Send to NEW customers: 14 days after first purchase
Send to ACTIVE customers: Quarterly (rotate cohorts)
Send to LAPSED customers: Use the customer winback flow instead
`,
  },
  {
    slug: "loyalty-program-rules-template",
    title: "Loyalty Program Rules Template",
    category: "operational",
    categoryLabel: "Operational",
    description:
      "Plain-language rules document for a points or perks loyalty program — covering earning, redemption, expiration, and edge cases.",
    whatsInside: [
      "Full program terms (members can actually read)",
      "Earning rules (points per dollar)",
      "Redemption tiers and values",
      "Expiration policy",
      "Tier structure (bronze/silver/gold)",
      "Edge cases (returns, transfers, account merging)",
      "Modification and termination clauses",
    ],
    howToUse: [
      "Publish on your website with a stable URL. Update with version dates so members can see what changed.",
      "Link to the rules from your signup page, account dashboard, and every loyalty-related email.",
      "Train your customer service team — most disputes are clarified by pointing to specific clauses.",
    ],
    why: "Loyalty programs without clear rules become customer service nightmares. Members assume the most generous interpretation; you assume the strictest. The rules doc makes the contract explicit so support can resolve issues in 30 seconds instead of 30 minutes.",
    content: `LOYALTY PROGRAM RULES & TERMS
==============================

PROGRAM NAME: {Program Name}
EFFECTIVE DATE: ____________
LAST UPDATED: ____________
VERSION: 1.0


1. ELIGIBILITY
--------------
- Open to individuals 18 years or older
- One account per person
- Email address required for enrollment
- Employees and immediate family members of {business_name} are not eligible to earn rewards


2. EARNING POINTS
-----------------
- 1 point per $1 spent (excluding taxes and shipping)
- Bonus points for specific actions (subject to change):
  * Sign up for account: 100 points
  * Birthday: 50 points (must be on file)
  * Refer a friend who purchases: 500 points
  * Leave a review (positive or negative): 100 points
  * Follow on Instagram/TikTok: 50 points each

- Points are earned only on completed, paid transactions
- Returns will deduct corresponding points
- Promotional purchases (>50% off) earn 50% of normal points
- Gift card purchases do not earn points; gift card redemptions do


3. REDEEMING POINTS
-------------------
Standard redemption tiers:
- 250 points = $5 reward
- 500 points = $12 reward
- 1,000 points = $25 reward
- 2,500 points = $75 reward
- 5,000 points = $200 reward

Rules:
- Minimum redemption: 250 points
- One reward per transaction
- Cannot combine with other promotional codes
- Cannot be applied to taxes, shipping, or gift cards
- Cannot be exchanged for cash


4. POINT EXPIRATION
-------------------
- Points expire 12 months after the date they were earned
- We will send email reminders 60, 30, and 7 days before expiration
- Expired points cannot be reinstated


5. TIER STRUCTURE (optional)
----------------------------
Members progress through tiers based on annual spend:

BRONZE (default): $0 – $499/year
- Earn 1 point per $1
- Birthday bonus

SILVER: $500 – $1,499/year
- Earn 1.25 points per $1
- Free standard shipping
- Early access to new products (24 hours)

GOLD: $1,500+/year
- Earn 1.5 points per $1
- Free express shipping
- Early access to new products (72 hours)
- Exclusive Gold-only events

Tier status calculated on rolling 12-month basis. Tier benefits unlock immediately upon qualifying purchase.


6. RETURNS AND CANCELLATIONS
----------------------------
- Returned items will result in deduction of points earned on that purchase
- Rewards redeemed on returned items will be returned to your points balance
- If a return takes your balance negative, you must earn it back before next redemption


7. ACCOUNT TRANSFER AND MERGING
-------------------------------
- Points are non-transferable between accounts
- Cannot be willed, inherited, or assigned to another person
- If you have multiple accounts, contact support to merge — only one account is permitted per individual


8. ACCOUNT INACTIVITY
---------------------
- Accounts with no activity (purchase, redemption, login) for 24 months may be deactivated
- 30 days notice will be sent before deactivation
- Reactivation possible by making any purchase within 90 days


9. FRAUD AND ABUSE
------------------
{Business_name} reserves the right to deactivate any account and forfeit points if:
- Multiple accounts are created by one person
- Points are obtained through fraud or misrepresentation
- Reviews or referrals are found to be fake
- Account is used in violation of these terms


10. CHANGES TO THE PROGRAM
--------------------------
{Business_name} may modify these terms at any time. Changes will be:
- Posted on this page with an updated "Last Updated" date
- Emailed to active members at least 30 days before taking effect for material changes
- Material changes include: point earning rates, redemption values, expiration policy

Continued participation after changes constitutes acceptance.


11. PROGRAM TERMINATION
-----------------------
{Business_name} may terminate the program with 60 days notice. Members will be notified by email and given the opportunity to redeem all earned points before termination.


12. PRIVACY
-----------
Use of the program is governed by our Privacy Policy: {privacy_policy_url}


13. CONTACT
-----------
Questions about the program?
Email: {support_email}
Phone: {support_phone}
Hours: {support_hours}


VERSION HISTORY
---------------
v1.0 — {date} — Initial program launch
`,
  },
  {
    slug: "monthly-marketing-report-template",
    title: "Monthly Marketing Report Template",
    category: "reporting",
    categoryLabel: "Reporting",
    description:
      "One-page monthly marketing report that gets read by busy founders and leadership — KPIs, wins, misses, next steps.",
    whatsInside: [
      "One-page exec summary template",
      "KPI dashboard (8 core metrics)",
      "Channel breakdown table",
      "Wins / misses / next steps format",
      "Trend commentary prompts",
      "Forecast vs. actual variance section",
      "Distribution list and cadence template",
    ],
    howToUse: [
      "Send first Tuesday of every month covering the prior month. Consistent cadence builds trust.",
      "Keep it to ONE page. Anything longer doesn't get read.",
      "Include 1-2 charts max. Numbers are scanned; charts are remembered.",
    ],
    why: "Most marketing reports are 12-slide decks that nobody opens. A tight one-pager that arrives the same day every month becomes the document leadership actually uses to make decisions. The structure here is borrowed from agencies reporting to high-friction CFOs.",
    content: `MONTHLY MARKETING REPORT TEMPLATE
==================================

{BUSINESS_NAME} | MARKETING REPORT | {MONTH YEAR}
Prepared by: {your_name}
Distributed: {date}


HEADLINE (1 sentence)
=====================
Example: "Strong month — revenue +18% MoM on the back of TikTok ads and a successful email re-engagement push; CAC creeping up slightly, monitoring."


KEY METRICS (vs. prior month)
=============================

METRIC                  | THIS MONTH | LAST MONTH | CHANGE | YTD
----------------------- | ---------- | ---------- | ------ | ------
Revenue                 | $______    | $______    | ___%   | $______
New customers           | ______     | ______     | ___%   | ______
CAC                     | $______    | $______    | ___%   | $______
LTV                     | $______    | $______    | ___%   | $______
Website sessions        | ______     | ______     | ___%   | ______
Conversion rate         | ___%       | ___%       | ___pp  | ___%
Email list growth       | ______     | ______     | ___%   | ______
Social followers (net)  | ______     | ______     | ___%   | ______


CHANNEL BREAKDOWN
=================

CHANNEL          | SPEND    | REVENUE  | ROAS  | CAC    | NEW CUST
---------------- | -------- | -------- | ----- | ------ | --------
Meta ads         | $______  | $______  | ___x  | $___   | ___
Google ads       | $______  | $______  | ___x  | $___   | ___
TikTok ads       | $______  | $______  | ___x  | $___   | ___
SEO/organic      | $______  | $______  | ___x  | $___   | ___
Email            | $______  | $______  | ___x  | $___   | ___
Referral / perks | $______  | $______  | ___x  | $___   | ___
Influencer       | $______  | $______  | ___x  | $___   | ___
TOTAL            | $______  | $______  | ___x  | $___   | ___


WINS
====
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________


MISSES
======
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________


WHAT'S WORKING (double down next month)
=======================================
- _______________________________________________
- _______________________________________________


WHAT'S NOT (cut or pivot)
=========================
- _______________________________________________
- _______________________________________________


NEXT MONTH PRIORITIES
=====================
1. _______________________________________________ (Owner: ____)
2. _______________________________________________ (Owner: ____)
3. _______________________________________________ (Owner: ____)


FORECAST VS. ACTUAL
===================

METRIC          | FORECAST | ACTUAL  | VARIANCE
--------------- | -------- | ------- | --------
Revenue         | $______  | $______ | ___%
New customers   | ______   | ______  | ___%
CAC             | $______  | $______ | ___%

Variance commentary: _______________________________


ASKS / BLOCKERS
===============
- _______________________________________________
- _______________________________________________


DISTRIBUTION CHECKLIST
======================
Recipients:
[ ] Founder / CEO
[ ] Sales lead
[ ] Operations lead
[ ] Finance / bookkeeper
[ ] Board (quarterly)

Cadence: First Tuesday of every month, 9am, email + Slack
`,
  },
  {
    slug: "social-media-analytics-dashboard-template",
    title: "Social Media Analytics Dashboard Template",
    category: "reporting",
    categoryLabel: "Reporting",
    description:
      "Weekly social media dashboard tracking the 6 metrics that actually matter — across Instagram, TikTok, LinkedIn, and Facebook.",
    whatsInside: [
      "Cross-platform metrics table (printable)",
      "6 'core' metrics defined (no vanity)",
      "Top-post analysis worksheet",
      "Audience growth chart structure",
      "Engagement rate formula by platform",
      "Weekly review questions",
      "Monthly trend summary section",
    ],
    howToUse: [
      "Pick the 6 metrics that match your goals. For most: reach, engagement rate, follower growth, saves, profile clicks, website clicks.",
      "Pull numbers every Friday — same time, same metrics. Consistency is what creates trend signal.",
      "Spend 15 minutes analyzing, not 2 hours formatting. The point is the decision, not the dashboard.",
    ],
    why: "Likes are vanity. Saves, shares, profile clicks, and link clicks are what predict revenue. This template eliminates 80% of the noise that social platforms surface by default and focuses on the metrics that actually correlate with business outcomes.",
    content: `SOCIAL MEDIA ANALYTICS DASHBOARD
=================================

WEEK ENDING: ____________
PULLED BY: ____________


CORE METRICS (track weekly, all platforms)
==========================================

METRIC              | INSTAGRAM | TIKTOK   | LINKEDIN | FACEBOOK | TOTAL
------------------- | --------- | -------- | -------- | -------- | --------
Followers (end)     | ______    | ______   | ______   | ______   | ______
Follower growth     | ______    | ______   | ______   | ______   | ______
Reach (7 days)      | ______    | ______   | ______   | ______   | ______
Engagement (7 days) | ______    | ______   | ______   | ______   | ______
Engagement rate     | ___%      | ___%     | ___%     | ___%     | ___%
Profile visits      | ______    | ______   | ______   | ______   | ______
Website clicks      | ______    | ______   | ______   | ______   | ______


ENGAGEMENT RATE FORMULA (use these, not the platform defaults)
--------------------------------------------------------------
INSTAGRAM: (likes + comments + saves + shares) / reach × 100
TIKTOK: (likes + comments + shares + saves) / video views × 100
LINKEDIN: (reactions + comments + reposts) / impressions × 100
FACEBOOK: (reactions + comments + shares) / reach × 100

Healthy benchmarks (2026):
- Instagram: 1.5–4% engagement rate
- TikTok: 5–9%
- LinkedIn: 2–5%
- Facebook: 0.5–2%


TOP 3 POSTS THIS WEEK
=====================

POST 1
Platform: _________
Format: _________ (Reel / carousel / single / Story)
Topic: _____________________________________________
Reach: ______   ER: ___%   Saves: ______   Shares: ______
Why it worked: ____________________________________


POST 2
Platform: _________
Format: _________
Topic: _____________________________________________
Reach: ______   ER: ___%   Saves: ______   Shares: ______
Why it worked: ____________________________________


POST 3
Platform: _________
Format: _________
Topic: _____________________________________________
Reach: ______   ER: ___%   Saves: ______   Shares: ______
Why it worked: ____________________________________


BOTTOM POST (one to learn from)
===============================
Platform: _________
Format: _________
Topic: _____________________________________________
Reach: ______   ER: ___%
Why it flopped: ___________________________________


AUDIENCE INSIGHTS
=================
Most engaged time slot: _____________________________
Top location (city/country): ________________________
Top age group: _____________________________________
Gender split: ______________________________________


CONVERSION METRICS
==================
Website sessions from social: ______
Email signups from social: ______
Direct sales attributed: $______
Cost per click (paid): $______


WEEKLY REVIEW QUESTIONS (15 min, Fridays)
=========================================
1. What format performed best? Do we have more in the pipeline?
2. Did any audio/trend take off we should ride next week?
3. What topic got the most saves? (Saves = highest-value signal)
4. Did anyone DM us? Did we reply within 24 hours?
5. Are we ahead of last week on follower growth? Why or why not?


MONTHLY TREND SUMMARY (end of month)
====================================

What grew:
- _______________________________________________

What shrank:
- _______________________________________________

Best content theme:
- _______________________________________________

Worst content theme:
- _______________________________________________

Next month focus:
- _______________________________________________
`,
  },
  {
    slug: "roi-tracking-spreadsheet-template",
    title: "ROI Tracking Spreadsheet Template",
    category: "reporting",
    categoryLabel: "Reporting",
    description:
      "Campaign-by-campaign ROI tracker that calculates true return — including labor, software, and opportunity cost.",
    whatsInside: [
      "Campaign-level ROI calculator",
      "True-cost columns (labor, tools, ad spend)",
      "Attribution model selector",
      "Payback period formula",
      "Cumulative ROI tracker",
      "Best/worst campaign ranking",
      "Quarterly portfolio review template",
    ],
    howToUse: [
      "Log every campaign before launching — name, hypothesis, expected ROI. Reviewing without baselines is meaningless.",
      "Track actual spend and revenue weekly. Don't wait until 'the end' — most campaigns drift mid-flight.",
      "Quarterly, kill the bottom 20% of campaigns by ROI. Reinvest in the top 20%.",
    ],
    why: "Most ROI tracking ignores labor and tool costs — making campaigns look profitable when they're not. This template forces true-cost accounting. The result: you'll discover that some of your 'best' campaigns are actually losing money once you count the 12 hours of work behind them.",
    content: `ROI TRACKING SPREADSHEET TEMPLATE
==================================

CAMPAIGN LOG
============

Columns to track (build this as a spreadsheet):

| # | CAMPAIGN NAME | START | END | CHANNEL | HYPOTHESIS | TARGET ROI | OWNER |
| - | ------------- | ----- | --- | ------- | ---------- | ---------- | ----- |
| 1 |               |       |     |         |            |            |       |
| 2 |               |       |     |         |            |            |       |


COST TRACKING (per campaign)
============================

| COST CATEGORY        | AMOUNT  | NOTES                            |
| -------------------- | ------- | -------------------------------- |
| Ad spend             | $______ | Direct media spend               |
| Creative production  | $______ | Photo, video, design             |
| Tools / software     | $______ | Pro-rated subscriptions used     |
| Internal labor       | $______ | Hours × hourly rate              |
| Agency / contractor  | $______ | Outside hires                    |
| Influencer / UGC     | $______ | Creator fees + product           |
| Opportunity cost     | $______ | (Optional) what else could happen|
| ────────────────────│─────────│──────────────────────────────────│
| TOTAL TRUE COST     | $______ |                                  |


REVENUE TRACKING (per campaign)
===============================

| REVENUE CATEGORY     | AMOUNT  | NOTES                            |
| -------------------- | ------- | -------------------------------- |
| Direct revenue       | $______ | Last-click attribution           |
| Assisted revenue     | $______ | Multi-touch attribution (50%)    |
| New subscribers      | ______  | × $LTV / list = $______          |
| Brand lift (est.)    | $______ | Use sparingly, hard to measure   |
| ────────────────────│─────────│──────────────────────────────────│
| TOTAL REVENUE        | $______ |                                  |


ROI CALCULATION
===============

True ROI = (Revenue - True Cost) / True Cost × 100

Example:
Revenue: $12,000
True Cost: $4,800
ROI = ($12,000 - $4,800) / $4,800 × 100 = 150%

Payback Period = True Cost / (Monthly revenue from campaign)
Example: $4,800 / $2,400 = 2 months


ATTRIBUTION MODELS (pick one)
=============================

LAST CLICK (default for most platforms):
- 100% credit to the last touchpoint before purchase
- Pros: Simple, available in every platform
- Cons: Undercredits awareness channels

FIRST CLICK:
- 100% credit to the first touchpoint
- Pros: Honors discovery channels
- Cons: Undercredits closing channels

LINEAR:
- Equal credit across all touchpoints
- Pros: Acknowledges every touch matters
- Cons: Overcredits low-value touches

TIME DECAY (recommended):
- More credit to recent touches, less to early
- Pros: Realistic for most journeys
- Cons: Requires more sophisticated tracking


CUMULATIVE ROI TRACKER (quarterly view)
=======================================

| QUARTER | TOTAL SPEND | TOTAL REVENUE | NET PROFIT | ROI %  |
| ------- | ----------- | ------------- | ---------- | ------ |
| Q1      | $______     | $______       | $______    | ___%   |
| Q2      | $______     | $______       | $______    | ___%   |
| Q3      | $______     | $______       | $______    | ___%   |
| Q4      | $______     | $______       | $______    | ___%   |
| YEAR    | $______     | $______       | $______    | ___%   |


BEST / WORST CAMPAIGNS THIS QUARTER
===================================

TOP 3 BY ROI:
1. ___________________________ — ___% ROI
2. ___________________________ — ___% ROI
3. ___________________________ — ___% ROI

BOTTOM 3 BY ROI:
1. ___________________________ — ___% ROI  → KILL / FIX / RUN
2. ___________________________ — ___% ROI  → KILL / FIX / RUN
3. ___________________________ — ___% ROI  → KILL / FIX / RUN


QUARTERLY PORTFOLIO REVIEW
==========================

Questions to answer:
- What's our highest-ROI channel? Are we under-investing?
- What's our lowest-ROI channel? Why are we still running it?
- Are we tracking the labor cost honestly?
- Which campaigns surprised us (positively or negatively)?
- What did we learn that we'll apply next quarter?


COMMON MISTAKES
===============
- Ignoring labor cost ("we already pay that person" doesn't make it free)
- Counting revenue twice (last-click on one platform, assisted on another)
- Comparing ROI across channels with different time windows
- Not setting a baseline ROI target before launch
- Killing campaigns too early (Meta needs 7+ days of learning)
`,
  },
  {
    slug: "customer-acquisition-tracker-template",
    title: "Customer Acquisition Tracker Template",
    category: "reporting",
    categoryLabel: "Reporting",
    description:
      "Track every new customer by source, cohort, and CAC — and see exactly which channels are scalable.",
    whatsInside: [
      "Customer-level acquisition log",
      "Source attribution columns",
      "Cohort retention table",
      "CAC by channel tracker",
      "Payback period per cohort",
      "Quality score per channel",
      "Monthly summary dashboard",
    ],
    howToUse: [
      "Log every new customer's source on day 1 — ask them, don't guess. 'How did you hear about us?' is the single highest-value question in customer onboarding.",
      "Track cohort retention monthly. Cohorts reveal channel quality far better than CAC alone.",
      "Use the quality score to decide where to scale. High retention + low CAC = pour fuel.",
    ],
    why: "CAC alone is misleading. A channel can deliver $20 CAC but if those customers churn in 30 days, you're losing money. This template ties acquisition to retention — the real measure of channel quality.",
    content: `CUSTOMER ACQUISITION TRACKER
=============================

CUSTOMER-LEVEL LOG (spreadsheet)
================================

| ID | NAME | EMAIL | SIGNUP DATE | SOURCE | CAMPAIGN | FIRST ORDER $ | LTV $ | STATUS |
| -- | ---- | ----- | ----------- | ------ | -------- | ------------- | ----- | ------ |
| 001|      |       |             |        |          |               |       |        |
| 002|      |       |             |        |          |               |       |        |


SOURCE CATEGORIES (standardize these)
=====================================
- Google search (organic)
- Google ads
- Meta ads (Facebook + Instagram)
- TikTok organic
- TikTok ads
- LinkedIn
- Referral — friend
- Referral — partner
- Email (existing list)
- Direct (typed URL)
- Influencer
- Podcast
- Event
- Other (must specify)

CRITICAL: Ask "How did you hear about us?" at signup. Self-reported source beats platform attribution 90% of the time.


CAC BY CHANNEL (monthly snapshot)
=================================

| CHANNEL         | SPEND   | NEW CUST | CAC    | AVG 1ST ORDER | LTV (90d) | PAYBACK |
| --------------- | ------- | -------- | ------ | ------------- | --------- | ------- |
| Google search   | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| Google ads      | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| Meta ads        | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| TikTok organic  | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| TikTok ads      | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| LinkedIn        | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| Referral        | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| Email           | $______ | ______   | $___   | $______       | $______   | ___ mo  |
| Influencer      | $______ | ______   | $___   | $______       | $______   | ___ mo  |


COHORT RETENTION TABLE
======================

Track what % of each month's new customers are still active 30, 60, 90 days later.

| COHORT | NEW CUST | DAY 30 | DAY 60 | DAY 90 | DAY 180 |
| ------ | -------- | ------ | ------ | ------ | ------- |
| Jan    | ______   | ___%   | ___%   | ___%   | ___%    |
| Feb    | ______   | ___%   | ___%   | ___%   | ___%    |
| Mar    | ______   | ___%   | ___%   | ___%   | ___%    |
| Apr    | ______   | ___%   | ___%   | ___%   | ___%    |
| May    | ______   | ___%   | ___%   | ___%   |         |
| Jun    | ______   | ___%   | ___%   |        |         |
| Jul    | ______   | ___%   | ___%   |        |         |


CHANNEL QUALITY SCORE
=====================

For each channel, calculate quality score (0–100):

Quality = (90-day retention % × 0.4) + (LTV-to-CAC ratio × 10 × 0.4) + (Volume reliability × 0.2)

| CHANNEL         | RETENTION % | LTV:CAC | QUALITY SCORE | DECISION         |
| --------------- | ----------- | ------- | ------------- | ---------------- |
| Google search   |             |         |               | Scale / hold / cut|
| Meta ads        |             |         |               |                  |
| TikTok ads      |             |         |               |                  |
| Referral        |             |         |               |                  |
| Email           |             |         |               |                  |
| Influencer      |             |         |               |                  |

DECISION RULES:
- Quality > 70: Scale aggressively
- Quality 40–70: Hold and optimize
- Quality < 40: Cut or major pivot


MONTHLY SUMMARY
===============

This month's headline number: ______ new customers, $___ CAC

Best channel by CAC: _______________________________
Best channel by retention: _______________________________
Best channel by LTV:CAC: _______________________________
Worst channel: ___________________ (action: ____________)

Channels to scale next month:
1. _______________________________________________
2. _______________________________________________


WARNINGS TO WATCH
=================

[ ] Any channel where 90-day retention dropped below 50%?
[ ] Any channel where CAC has risen >30% in 3 months?
[ ] Are we over-concentrated in one channel (>60% of new customers)?
[ ] Did any channel deliver volume we can't actually service?
`,
  },
  {
    slug: "review-management-checklist",
    title: "Review Management Checklist",
    category: "reporting",
    categoryLabel: "Reporting",
    description:
      "Weekly checklist for monitoring, responding to, and learning from customer reviews across Google, Yelp, Facebook, and industry sites.",
    whatsInside: [
      "Daily 10-min check routine",
      "Weekly response template library",
      "5-star, 4-star, 3-star, and 1-2 star reply scripts",
      "Owner escalation criteria",
      "Theme tracking template",
      "Cross-platform monitoring setup",
      "Monthly trend analysis prompts",
    ],
    howToUse: [
      "Block 10 minutes daily for the check, 30 minutes weekly for the deep review.",
      "Respond to every review within 48 hours — including 5-stars. Silence on positive reviews is a missed opportunity.",
      "Track recurring themes monthly. If 'wait time' shows up in 5+ reviews, that's an ops fix, not a marketing one.",
    ],
    why: "Reviews drive 90% of local purchase decisions. Most businesses respond only to negatives — but the businesses that win consistently respond to ALL reviews, fast, with personality. This checklist makes that habit sustainable instead of overwhelming.",
    content: `REVIEW MANAGEMENT CHECKLIST
============================

PLATFORMS TO MONITOR (set up notifications for each)
====================================================
[ ] Google Business Profile
[ ] Yelp
[ ] Facebook
[ ] Industry-specific: ______________________________
   (e.g. TripAdvisor, Houzz, Healthgrades, G2, Capterra)
[ ] Your own product reviews (if e-commerce)
[ ] Reddit / forums where your brand is mentioned


DAILY CHECK (10 minutes, every morning)
=======================================
[ ] Open all platforms — any new reviews overnight?
[ ] Flag any 1–3 star reviews for owner reply
[ ] Reply to all 4–5 star reviews (template responses OK)
[ ] Note any review themes that match yesterday's


WEEKLY DEEP REVIEW (30 minutes, Friday)
=======================================
[ ] Aggregate this week's review count by platform
[ ] Calculate average star rating this week vs. last
[ ] Note any recurring themes (positive or negative)
[ ] Forward themes to operations / product team
[ ] Owner reads every 1–2 star review personally
[ ] Decide if any review needs a follow-up offline


RESPONSE SCRIPTS
================

5-STAR REVIEW (use sparingly, vary the language)
"Thank you so much, {name}! Reviews like yours make our day. Looking forward to seeing you again soon."

4-STAR REVIEW
"Thanks for the kind words, {name}! We always want to be at our best — if there's anything that kept this from being a 5-star experience, we'd love to hear so we can improve. Either way, we appreciate you!"

3-STAR REVIEW
"Hi {name}, thanks for taking the time to leave honest feedback. We can see we fell short on {specific point if mentioned}. We'd love the chance to make it right — could you email us at {email} so we can talk? — {owner_name}"

1–2 STAR REVIEW
"{name}, I'm sorry your experience didn't meet expectations. {Acknowledge their specific complaint without making excuses}. This isn't who we want to be. I'd genuinely like to understand what happened and make it right. Please reach me directly at {owner_email or phone}. — {owner_first_name}, Owner"


OWNER ESCALATION CRITERIA
=========================

Escalate to owner immediately if review mentions:
[ ] Safety, health, or hygiene concern
[ ] Discrimination or harassment
[ ] Employee misconduct
[ ] Allegation of illegal activity
[ ] Threat of legal action or media
[ ] Claim that is materially false

Owner handles personally within 24 hours.


THEME TRACKING TEMPLATE
=======================

POSITIVE THEMES (what people love)
| THEME       | MENTIONS THIS MONTH | TREND |
| ----------- | ------------------- | ----- |
|             |                     |       |
|             |                     |       |

NEGATIVE THEMES (what people complain about)
| THEME       | MENTIONS THIS MONTH | TREND  | OWNER  | FIX BY |
| ----------- | ------------------- | ------ | ------ | ------ |
|             |                     |        |        |        |
|             |                     |        |        |        |


MONTHLY METRICS DASHBOARD
=========================

METRIC                       | THIS MONTH | LAST MONTH | YTD
---------------------------- | ---------- | ---------- | ------
Total new reviews            | ______     | ______     | ______
Average star rating          | ___        | ___        | ___
% 5-star reviews             | ___%       | ___%       | ___%
% 1–2 star reviews           | ___%       | ___%       | ___%
Response rate (your replies) | ___%       | ___%       | ___%
Average response time (hrs)  | ___        | ___        | ___


DON'T DO THIS
=============

- Don't argue with a reviewer in public — take it offline
- Don't offer compensation in response to a public review (Google flags this)
- Don't use the same reply for every review — looks robotic
- Don't ask reviewers to delete or change reviews — violates platform terms
- Don't buy reviews — they get detected and removed, and damage trust
- Don't ignore positive reviews — silence trains people not to leave them


COMPLIANCE NOTES
================

- FTC requires that incentives for reviews be disclosed
- Never offer discounts specifically for positive reviews (illegal)
- Can offer rewards for "leaving feedback" (positive OR negative) — must be neutral
- All review responses are public and indexed by Google — write like you'd want quoted
- Keep records of all review interactions for at least 12 months
`,
  },
];

