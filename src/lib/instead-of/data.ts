// Data for /instead-of/[method] pages.
// Bottom-funnel comparison content for businesses choosing between
// a DIY/manual method and Social Perks. Honest, advisor-tone, not sales-pitch.

export interface InsteadOfFAQ {
  q: string;
  a: string;
}

export interface MigrationStep {
  title: string;
  body: string;
}

export interface MathExample {
  diyLabel: string;
  diyCost: string;
  diyBreakdown: string;
  socialPerksLabel: string;
  socialPerksCost: string;
  socialPerksBreakdown: string;
  honestNote: string;
}

export interface DIYMethod {
  slug: string;
  name: string; // short, used in copy: "spreadsheet tracking"
  displayName: string; // sentence-cased headline form: "Spreadsheet Tracking"
  description: string; // 1-line summary used on the index
  category: string; // e.g. "Tracking & rewards", "Customer outreach"
  pros: string[]; // 3 honest benefits
  cons: string[]; // 4 limitations
  differentiators: string[]; // 5 Social Perks differentiators
  mathExample: MathExample;
  whenToStick: string[]; // honest cases where DIY is fine
  whenToSwitch: string[]; // volume / situation thresholds
  migrationSteps: MigrationStep[]; // 3 steps
  faqs: InsteadOfFAQ[]; // 6 FAQs
}

export const DIY_METHODS: DIYMethod[] = [
  // 1 — SPREADSHEET TRACKING
  {
    slug: "spreadsheet-tracking",
    name: "spreadsheet tracking",
    displayName: "Spreadsheet Tracking",
    description:
      "Tracking customer perks, points, and redemptions in Google Sheets or Excel.",
    category: "Tracking & rewards",
    pros: [
      "It's free and uses tools you already know. No new login, no new bill, no learning curve.",
      "You have total control over the schema. Add a column, change a rule, archive a customer — nothing's locked behind a feature gate.",
      "It works offline and is portable. The file is yours forever and you can hand it to a bookkeeper or accountant without an export step.",
    ],
    cons: [
      "Manual data entry compounds. Every redemption, every new customer, every adjustment is a row you have to type — and one missed entry breaks the audit trail.",
      "There's no enforcement. A customer claiming they earned a perk they didn't earn is hard to disprove when the only record is a sheet your staff updates by memory at end of day.",
      "It doesn't scale past ~200 active members. Filtering, sorting, and finding a specific customer's history starts taking real minutes per lookup.",
      "Staff turnover destroys it. When the person who built the sheet leaves, the formulas, conditional formatting, and tribal knowledge of \"how it works\" leave with them.",
    ],
    differentiators: [
      "Customers self-serve via QR code or link. They check their own balance instead of asking a cashier — your staff time drops to near zero.",
      "Every action is event-sourced. Earn, redeem, expire, adjust — all timestamped and immutable. You get an audit trail without keeping one.",
      "Perks tie to actions, not just visits. Customer posts a story, leaves a Google review, refers a friend — the system credits them automatically.",
      "Reporting is real-time. \"How many active members do we have? What's our redemption rate? Who's about to lapse?\" — answers in two clicks instead of a Sunday-afternoon pivot table.",
      "It survives turnover. Onboarding a new manager is a 15-minute walkthrough instead of a 3-hour transfer-of-tribal-knowledge session.",
    ],
    mathExample: {
      diyLabel: "Spreadsheet tracking",
      diyCost: "~$800/month in your time",
      diyBreakdown:
        "Conservatively: 5 hrs/week updating rows, reconciling redemptions, and fixing errors × $40/hr = $200/week = ~$800/month. Plus the un-priced cost of customer disputes and lost loyalty.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + ~1 hr/week",
      socialPerksBreakdown:
        "$49/month for the Starter plan + roughly 1 hour/week reviewing the dashboard and approving submissions = ~$40 in your time. Total ~$89/month all-in.",
      honestNote:
        "If you have under 50 active loyalty members, the spreadsheet may genuinely cost less time than learning a new tool. The math flips around 75–100 members.",
    },
    whenToStick: [
      "You have fewer than ~50 active loyalty members and your staff is comfortable with the sheet.",
      "Your perks are simple (\"every 10th coffee free\") and don't involve social proof or multi-channel actions.",
      "You're testing whether a loyalty program even works before committing to software. A 90-day spreadsheet pilot is a smart sequence.",
    ],
    whenToSwitch: [
      "You have 75+ active members and lookups are starting to take real time.",
      "You've had at least one redemption dispute you couldn't resolve cleanly.",
      "You want perks to be earned through social actions (reviews, posts, referrals) — spreadsheets can't verify those.",
      "You've hired or are about to hire — onboarding to a tool is faster than onboarding to your sheet.",
    ],
    migrationSteps: [
      {
        title: "Export your sheet as CSV",
        body:
          "Open your tracking sheet, File → Download → CSV. If you have multiple tabs (members, redemptions, perks), export each one. No data transformation needed yet.",
      },
      {
        title: "Run the Social Perks import wizard",
        body:
          "Drop the CSVs into the import wizard. It auto-detects member name, email, phone, current balance, and join date. You'll review the column mapping once and confirm.",
      },
      {
        title: "Send a one-time \"we moved\" SMS",
        body:
          "Use the built-in announcement flow to text or email members a personal link to check their balance. Existing balances import 1:1 — no one loses points.",
      },
    ],
    faqs: [
      {
        q: "Will my existing point balances transfer over?",
        a: "Yes, 1:1. The import wizard reads your balance column and credits each member exactly what they had. If your sheet uses a custom ratio (e.g., $1 = 10 points), we preserve that.",
      },
      {
        q: "What if my spreadsheet is messy and inconsistent?",
        a: "That's normal. The wizard flags rows it can't parse (missing email, duplicate phone numbers, etc.) and lets you fix or skip them. Most businesses end up cleaning ~5–10% of their data during import.",
      },
      {
        q: "Can I keep the spreadsheet running in parallel for a while?",
        a: "Yes, and we recommend it for the first 2 weeks. Update both, compare totals weekly, and only retire the sheet once you trust the numbers match.",
      },
      {
        q: "What about historical redemption data — do I need it?",
        a: "For most local businesses, no. We import current balances and start the new ledger from day one. Pull historical reports from the sheet if you need them for taxes; you don't need them inside Social Perks.",
      },
      {
        q: "Can my staff still adjust balances manually?",
        a: "Yes. Every staff member has an \"adjust\" permission you can toggle. Manual adjustments are logged with who made them and why, which fixes the audit-trail gap spreadsheets have.",
      },
      {
        q: "What does the math look like for a tiny business — say, 30 customers?",
        a: "Honestly? The spreadsheet is probably fine. At 30 customers you're spending maybe 30 minutes/week tracking, and software adds login overhead for both you and members. Revisit when you hit ~75 members or want to add social actions.",
      },
    ],
  },

  // 2 — PUNCH CARDS
  {
    slug: "punch-cards",
    name: "punch cards",
    displayName: "Physical Punch Cards",
    description:
      "Paper loyalty cards (\"buy 9, get the 10th free\") that customers carry in their wallets.",
    category: "Tracking & rewards",
    pros: [
      "Tangible and instantly understood. No app, no signup, no email — customers \"get it\" the moment you hand them the card.",
      "Cost is trivial. A few cents per card and a stamp or hole-punch you already own.",
      "It works offline and during outages. The card in their wallet doesn't depend on your POS being up.",
    ],
    cons: [
      "You have zero data. You don't know who your loyal customers are, what they buy, or which ones are about to churn.",
      "Fraud is rampant. Customers laminate cards and re-stamp them, photocopy them, or claim a lost card on its 9th punch. There's no audit.",
      "You can't communicate with them. No way to send a \"come back, we miss you\" message — you don't have their phone number or email.",
      "Lost cards = lost loyalty. When a customer loses their card on punch 7, they're not coming back to start over. You just lost the relationship.",
    ],
    differentiators: [
      "Digital punch card lives on the customer's phone — no laminating, no lost cards.",
      "You see who they are. Phone number, visit frequency, last purchase — basic CRM you've never had before.",
      "Send a one-tap \"we miss you\" SMS to anyone who hasn't punched in 30 days. Reactivation campaigns are a real thing now.",
      "Earn punches for non-purchase actions too — leave a Google review, post a story, refer a friend.",
      "Anti-fraud is built in: one phone number per account, geofenced check-ins optional, and every punch is timestamped.",
    ],
    mathExample: {
      diyLabel: "Punch cards",
      diyCost: "~$200–500/month in lost revenue",
      diyBreakdown:
        "Cards cost ~$30/month to print, but fraud + lost cards conservatively cost a 50-transaction/day business 2–4 free items per day that shouldn't have been redeemed. At $8/item × 3/day × 30 days = ~$720/month in shrinkage.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + a phone scanner",
      socialPerksBreakdown:
        "$49/month for digital punch cards + customer CRM + automated reactivation. A staff-facing scanner on an iPad you already own.",
      honestNote:
        "If you do under 20 punches a day, fraud loss is small enough that paper still pencils out. Above that, the math tips fast.",
    },
    whenToStick: [
      "You do fewer than 20 punches a day and your community is small enough that fraud isn't a real risk.",
      "Your customers skew older or you're in a market where phone-based check-ins create real friction.",
      "Your average ticket is so low (under $3) that no software fee makes sense.",
    ],
    whenToSwitch: [
      "You're handing out 50+ punch cards a week.",
      "You've caught (or suspect) fraud more than once.",
      "You want to text customers about a slow Tuesday or a new product.",
      "You'd benefit from knowing which customers are your top 10% by frequency.",
    ],
    migrationSteps: [
      {
        title: "Set up the digital punch card",
        body:
          "In the dashboard, configure your rule (e.g., \"10 punches = 1 free coffee\") and pick the customer entry method: phone number, QR scan, or NFC tap. Most businesses use phone number — it's universal.",
      },
      {
        title: "Honor existing paper punches",
        body:
          "When a customer comes in with a paper card, ask their phone number, add them, and credit the punches they have. We recommend keeping paper cards as a fallback for 30 days while customers adjust.",
      },
      {
        title: "Train your staff (15 minutes)",
        body:
          "One screen, two buttons: \"Add punch\" and \"Redeem reward.\" That's it. Most cashiers are confident within their first shift.",
      },
    ],
    faqs: [
      {
        q: "What if my customers don't want to give a phone number?",
        a: "About 5–10% of customers refuse. For them, keep punch cards as a backup — there's no rule that everyone has to use the same method. Most businesses run both in parallel for a few months and then quietly retire paper.",
      },
      {
        q: "Do customers need to download an app?",
        a: "No. They get a SMS with a link to their card, which they can save to Apple Wallet or Google Wallet. No app store, no install. About 80% save it; the rest just look up their phone number at the counter.",
      },
      {
        q: "What about customers who paid cash and didn't give their info?",
        a: "Walk-in punches are still supported. Staff taps \"anonymous punch\" and the system tracks total punches given out (useful for forecasting) without attributing them to a specific customer.",
      },
      {
        q: "Will I lose customers in the transition?",
        a: "Honestly, a few. About 2–5% of legacy punch-card customers won't move over. The trade-off is that the customers who do move are now reachable, measurable, and easier to retain.",
      },
      {
        q: "Can I run digital and paper simultaneously?",
        a: "Yes. We recommend it for 60–90 days. Customers self-select onto the digital version, and you slowly stop printing new paper cards.",
      },
      {
        q: "Does this work for businesses with multiple locations?",
        a: "Yes. Punches earned at one location are valid at all of them, and you'll see per-location reports separately for staffing and inventory decisions.",
      },
    ],
  },

  // 3 — HANDWRITTEN THANK YOU NOTES
  {
    slug: "handwritten-thank-you-notes",
    name: "handwritten thank-you notes",
    displayName: "Handwritten Thank-You Notes",
    description:
      "Hand-writing personal cards to ask customers for reviews or referrals.",
    category: "Reviews & referrals",
    pros: [
      "Conversion rates are genuinely high. A handwritten card gets 5–10x the review submission rate of a generic email request.",
      "It builds real loyalty. Customers remember a handwritten note for years — it's the kind of touch that creates word-of-mouth on its own.",
      "It's authentic and on-brand for small businesses. Nobody mistakes it for a corporate sequence, because it isn't one.",
    ],
    cons: [
      "It doesn't scale past ~10 cards a week. Past that, it becomes the thing you're avoiding on Sunday night.",
      "There's no measurement. Did the card lead to the review? Or would they have written it anyway? You'll never know.",
      "Tracking is manual. \"Did I send Maria a card yet?\" requires a checklist — and if you miss her, she won't say anything.",
      "Stamp + card + 5 minutes of writing time = ~$3–5 of hard cost per touch, and that's before you factor in postage to a wrong address.",
    ],
    differentiators: [
      "AI-generated SMS that reads like you wrote it — personal, short, named, references the specific service. Not a template.",
      "Sends are automated based on transaction triggers (X days after visit, X days after purchase, etc.) — no list to maintain.",
      "Conversion is measured. You see exactly which messages produce reviews, which don't, and what to change.",
      "Stack with a perk: \"Leave a review, get $5 off your next visit.\" Conversion typically goes 2–3x vs. an unstacked ask.",
      "FTC-compliant disclosure auto-included — handwritten asks rarely include this, which is technically a problem if you're offering a reward.",
    ],
    mathExample: {
      diyLabel: "Handwritten thank-you notes",
      diyCost: "~$300–600/month at scale",
      diyBreakdown:
        "Realistically you'll send 10–20 cards/week. At ~10 min/card writing + addressing + stamping × $40/hr = ~$70/week in time. Plus $1.50/card in materials. ~$350/month for 60 cards.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + ~15 min/week",
      socialPerksBreakdown:
        "$49/month plus a few minutes a week reviewing the sequence and approving the AI-drafted copy. Volume can scale to 1,000+ asks/month at the same cost.",
      honestNote:
        "Handwritten cards have a halo effect that SMS doesn't replicate. If you only have 20 best customers a year, keep writing the cards — it's not the bottleneck.",
    },
    whenToStick: [
      "You're sending fewer than 5 cards a week and they're for your top customers (not every customer).",
      "Your business is built on white-glove relationships — fine dining, bespoke services, high-ticket retail.",
      "Writing the cards is genuinely part of how you stay grounded in your business. Don't outsource that.",
    ],
    whenToSwitch: [
      "You're trying to ask every customer for a review and falling behind.",
      "You're seeing fewer than 5 new reviews per month and you serve 100+ customers in that window.",
      "You want to track which asks convert and tune over time.",
      "You're already paying for reviews software but still writing cards on top — pick one motion.",
    ],
    migrationSteps: [
      {
        title: "Keep cards for your top 20 customers",
        body:
          "Don't kill what's working. Identify your top 20 customers by revenue or frequency — keep handwriting cards to them. The automation handles the next 980.",
      },
      {
        title: "Connect your POS or scheduling tool",
        body:
          "Square, Toast, Shopify, Mindbody, Vagaro — pick yours. Social Perks reads transactions and triggers a review request a configurable number of days later (default: 3 days).",
      },
      {
        title: "Approve the first 5 AI-drafted messages",
        body:
          "The AI drafts personalized messages using the customer's name and what they bought. You review the first 5, tweak the tone, and then let it run autonomously.",
      },
    ],
    faqs: [
      {
        q: "Won't AI-drafted messages feel impersonal?",
        a: "They can, if you use a template. The AI uses transaction context (what they bought, when, who served them) to write a specific message — \"Maria, hope you're enjoying the gel manicure from Tuesday\" — which beats a generic card from someone they barely remember.",
      },
      {
        q: "What about review request laws?",
        a: "Google's policy allows asking customers for reviews; gating reviews (\"only happy customers please\") is what's not allowed. The built-in templates are policy-compliant by default. If you offer a perk for posting, FTC disclosure is auto-injected.",
      },
      {
        q: "Should I still send cards to my top customers?",
        a: "Yes — please do. The relationship-deepening effect of a real handwritten card is real, and SMS can't replicate it. Use software for the bottom 95% of customers and your hands for the top 5%.",
      },
      {
        q: "What's the typical response rate vs. handwritten?",
        a: "Honest numbers: handwritten cards get ~15–25% review rate; SMS asks with a perk get ~10–18%; SMS asks without a perk get ~3–6%. The volume difference more than makes up for the per-ask drop.",
      },
      {
        q: "Can the SMS include a personal note from me?",
        a: "Yes. You can pin a sentence (\"From Sarah — thanks again!\") that appears in every message, plus the AI personalizes around it.",
      },
      {
        q: "What if I don't have a POS or scheduling tool?",
        a: "You can upload a CSV weekly or use the manual \"Ask for review\" button. Most businesses without a POS find the manual flow takes 5 min/week and is still way faster than writing cards.",
      },
    ],
  },

  // 4 — MAILCHIMP NEWSLETTER
  {
    slug: "mailchimp-newsletter",
    name: "a Mailchimp newsletter",
    displayName: "Mailchimp Newsletters",
    description:
      "Sending monthly or weekly email newsletters to your customer list.",
    category: "Customer outreach",
    pros: [
      "It's a mature tool with strong deliverability — emails actually land in inboxes, not spam.",
      "The free tier (up to 500 contacts) is genuinely usable for small businesses just starting out.",
      "It's the standard, which means every other tool (POS, scheduling, e-commerce) has a Mailchimp integration. No data migration headaches.",
    ],
    cons: [
      "Email open rates for local-business newsletters average 18–22% — meaning 4 out of 5 customers don't see the message.",
      "Most newsletters are one-way broadcasts. There's no \"action\" the customer can take that earns them something — they just read (or don't) and close it.",
      "Templates are designed for B2B/SaaS. Making a local-business newsletter feel personal and on-brand takes real design effort or a paid template.",
      "Growth is slow. You're hoping people sign up at the counter; there's no built-in viral loop.",
    ],
    differentiators: [
      "SMS open rates are 95%+ vs. email's 18–22%. For local businesses, SMS is where customers actually pay attention.",
      "Every message is an action, not just info. \"Show this text for $5 off,\" \"Reply YES to book Tuesday's class\" — customers respond, you measure.",
      "Customer earns perks for engaging — turning your outreach list into your loyalty program at the same time.",
      "AI generates the copy based on your business type and goal. No staring at a blank Mailchimp editor on a Sunday afternoon.",
      "Two-way replies are native. When a customer texts back, it lands in a shared inbox your team can answer from a phone.",
    ],
    mathExample: {
      diyLabel: "Mailchimp newsletter",
      diyCost: "~$200/month all-in",
      diyBreakdown:
        "Mailchimp Standard for 1,500 contacts: ~$20/month. Your time writing/designing 4 newsletters/month at 90 min each × $40/hr = ~$240/hr = ~$240/month. Total: ~$260/month.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49–$79/month + 30 min/week",
      socialPerksBreakdown:
        "$49–$79/month including SMS volume, plus ~30 min/week reviewing AI-drafted campaigns and approving them.",
      honestNote:
        "Email isn't dead. If your audience is professional or B2B-leaning, keep Mailchimp. For local consumer businesses, SMS-first delivers a different order of magnitude in engagement.",
    },
    whenToStick: [
      "Your customer base is professional/B2B (lawyers, accountants, consultants) — they prefer email.",
      "You send genuinely long-form content (a chef's recipe, an industry update) — SMS isn't the format for that.",
      "You already have a 1,000+ engaged subscriber base and the open rate is above 25%.",
    ],
    whenToSwitch: [
      "Your open rate is below 20% and not improving.",
      "You serve a local consumer audience — restaurants, salons, retail, fitness, services.",
      "You want customers to take an action from the message, not just read it.",
      "You'd rather your outreach also feed your loyalty program instead of being a separate motion.",
    ],
    migrationSteps: [
      {
        title: "Export your Mailchimp contacts",
        body:
          "Audience → All contacts → Export. You get a CSV with names, emails, signup dates, and engagement scores. Total export time: under 2 minutes.",
      },
      {
        title: "Import + collect phone numbers",
        body:
          "Drop the CSV into Social Perks. For contacts missing a phone number (most will be), the system sends a one-time email asking them to claim a perk in exchange for adding their number. Typical opt-in: 30–45%.",
      },
      {
        title: "Run your first SMS campaign",
        body:
          "Tell the AI agent your goal (\"fill Tuesday at 6pm,\" \"clear back-bar inventory,\" \"promote new service\"). It generates the SMS, the perk, and the schedule in under 10 minutes.",
      },
    ],
    faqs: [
      {
        q: "Won't customers be annoyed by SMS?",
        a: "They will if you spam them. Industry data: customers tolerate ~1 SMS/week from a business they like, and 1–2 SMS/month from one they're neutral on. The platform enforces frequency caps automatically.",
      },
      {
        q: "What about TCPA and SMS consent rules?",
        a: "Consent is mandatory and we make it easy: every signup includes explicit opt-in language, every message includes STOP-to-opt-out, and we keep an immutable record. If you're audited, you have what you need.",
      },
      {
        q: "Can I run email and SMS in parallel?",
        a: "Yes — and we recommend it for the first 60 days. Send email for long-form content (events, recipes, stories) and SMS for time-sensitive actions (promotions, last-minute openings).",
      },
      {
        q: "What's the SMS cost per message?",
        a: "Included in your plan up to the monthly cap (Starter: 500, Growth: 2,500, Scale: 10,000). Overages are billed at $0.015/message — meaningfully cheaper than most dedicated SMS tools.",
      },
      {
        q: "Will my brand voice survive AI drafting?",
        a: "You set the tone in setup (\"warm,\" \"professional,\" \"playful\") and pin sample messages that match your voice. The AI mimics what you've trained it on, and you approve every send before it goes.",
      },
      {
        q: "Can I still send newsletters?",
        a: "Yes. The Email module is included alongside SMS — same dashboard, same audience, same metrics. Most businesses end up using both, with SMS doing 70% of the work.",
      },
    ],
  },

  // 5 — ASKING CUSTOMERS IN PERSON
  {
    slug: "asking-customers-in-person",
    name: "asking customers in person",
    displayName: "Asking Customers in Person",
    description:
      "Verbally asking customers at checkout to leave a Google or Yelp review.",
    category: "Reviews & referrals",
    pros: [
      "It's free and feels authentic. Customers know it's a real human asking — not a robot.",
      "It builds the relationship. The conversation often goes beyond the review ask and surfaces feedback you'd never get from a survey.",
      "Conversion is high when done well. A warm in-person ask converts 20–30% of customers, vs. ~3–6% for a cold email.",
    ],
    cons: [
      "It's wildly inconsistent. Your morning shift asks every customer; your evening shift forgets — and you can't tell which is which from your review count.",
      "Most customers say yes and then never follow through. They mean it in the moment, then forget the second they're back in their car.",
      "It's awkward to ask, and awkward to repeat. Staff burn out on the ask after a few weeks.",
      "You can't track it. \"Did Lily ask 15 people today?\" Nobody knows. The signal is invisible.",
    ],
    differentiators: [
      "QR code on the receipt or table tent removes the awkwardness — customers self-serve the review on their phone, while they're still in the chair or at the table.",
      "AI-generated SMS hits the customer's phone 3 hours after they leave — by then they're home, on the couch, and 4x more likely to actually post.",
      "Stack a small perk (\"Leave a review, get $5 off\") and conversion jumps 2–3x. FTC disclosure is auto-injected.",
      "Reviews are tracked by staff member — you finally know whether Lily really is asking 15 a day, and which staffer's customers convert best.",
      "Negative-feedback intercept: if a customer rates the experience low, the flow routes them to a private feedback form instead of pushing them to Google.",
    ],
    mathExample: {
      diyLabel: "Asking in person",
      diyCost: "Free, but ~5 reviews/month",
      diyBreakdown:
        "Even with disciplined staff, a 50-customers-a-day business averages ~5–8 new Google reviews per month from in-person asks. That's a real rate, but it's plateaued.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + ~30 new reviews/month",
      socialPerksBreakdown:
        "Same 50 customers/day, but with QR + SMS follow-up + perk = ~25–40 new reviews/month for businesses that follow the playbook. 5–8x lift is typical.",
      honestNote:
        "Don't stop asking in person — that human warmth converts when nothing else does. Add software on top, don't replace the ask with it.",
    },
    whenToStick: [
      "You only need 1–2 new reviews per month to stay competitive in your local pack.",
      "Your business is so high-touch that asking in person is part of the experience (e.g., fine dining, bespoke services).",
      "You're at fewer than 20 customers/day — at that volume, the in-person ask alone can carry you.",
    ],
    whenToSwitch: [
      "You're getting fewer reviews than competitors in your area and falling on Google's local pack.",
      "You've trained staff to ask and review count still isn't moving.",
      "You serve 30+ customers/day — at that volume, missed asks compound.",
      "You'd benefit from negative-feedback intercept (private resolution before a 1-star review goes public).",
    ],
    migrationSteps: [
      {
        title: "Print a QR code for the counter and receipts",
        body:
          "Generate a Google review QR code (or a Yelp one — your call) in the dashboard. Print it as a counter sign, sticker on receipts, or table tent. Setup time: 5 minutes including printing.",
      },
      {
        title: "Connect your POS for SMS follow-up",
        body:
          "Square, Toast, Shopify, Vagaro, Mindbody — pick yours. The system will SMS each customer 3 hours after their visit with a personalized ask.",
      },
      {
        title: "Train staff on the new script",
        body:
          "One sentence: \"If you have a sec, scan this QR — it really helps us out.\" Way easier than asking for a review verbally. Most staff prefer it.",
      },
    ],
    faqs: [
      {
        q: "Will customers feel pressured by an SMS ask?",
        a: "Less pressure, not more — they read it on their own time. Industry data: SMS asks have lower opt-out rates than email asks because the ask is short, personal, and one-tap to act on.",
      },
      {
        q: "Is offering a perk for a review against Google's rules?",
        a: "Google's policy: don't offer rewards in exchange for positive reviews specifically. Offering a perk for any honest review is permitted by Google and FTC, provided the customer discloses they were incentivized — which the platform auto-injects.",
      },
      {
        q: "What about Yelp — they're stricter, right?",
        a: "Yes. Yelp's policy disallows asking for reviews entirely. For Yelp, we recommend not pushing for reviews — focus on Google, where it's allowed, and let Yelp reviews come organically.",
      },
      {
        q: "How does the negative-feedback intercept work?",
        a: "Before sending the customer to Google, the SMS asks \"How was your experience?\" with a 1–5 rating. If they tap 1–2, the flow shows a private feedback form. If 3–5, it links them to Google. This recovers 5–10 bad reviews/month for most businesses.",
      },
      {
        q: "Can I still ask in person too?",
        a: "Please do. The QR + SMS adds a layer; it doesn't replace the human moment. Best results come from businesses that do both.",
      },
      {
        q: "What's a realistic review goal for my first 90 days?",
        a: "Most local businesses 3–5x their monthly review velocity in the first 90 days. So if you were getting 5/month, expect 15–25/month. After 6 months, the rate plateaus — that's normal and means you've captured the bulk of your willing customers.",
      },
    ],
  },

  // 6 — INSTAGRAM STORIES SHOUTOUTS
  {
    slug: "instagram-stories-shoutouts",
    name: "Instagram stories shoutouts",
    displayName: "Instagram Stories Shoutouts",
    description:
      "DMing local influencers to do an unpaid Instagram story shoutout in exchange for product or service.",
    category: "Influencer & social",
    pros: [
      "It's how most local influencer marketing actually happens, and it works — the local-creator economy runs on trade.",
      "Cost is cash-free. You give product or service that has a high gross margin for you and feels valuable to them.",
      "Local relevance beats reach. A 2,000-follower local creator usually outperforms a 100,000-follower national one.",
    ],
    cons: [
      "Outreach is grindy. DM 30 creators, hear back from 6, get content from 2. The funnel is real.",
      "You can't track ROI. Did the story drive 2 new customers? 20? You'll never know without a code or link.",
      "FTC disclosure is almost never included. Most local shoutouts say nothing about it being sponsored — which is technically a problem if the creator is getting product in exchange.",
      "Relationships are one-off. There's no system for \"creators we've worked with before\" — every campaign starts from a cold DM.",
    ],
    differentiators: [
      "Built-in creator marketplace with 1,000+ pre-vetted local creators who've already opted in to perk-for-post.",
      "Every post includes a unique tracking link or perk code, so revenue is attributable. You finally know what each post drove.",
      "FTC disclosure auto-injected. Creators see the disclosure language right in the brief and post it correctly.",
      "Creator history lives in one place. \"Worked with us 3 times, average 28 conversions per post\" — actual data instead of vibes.",
      "Multi-creator campaigns: brief once, send to 10 creators, manage the whole batch from one inbox. Cuts campaign management 5x.",
    ],
    mathExample: {
      diyLabel: "DM-based shoutouts",
      diyCost: "~$400/month in time + product",
      diyBreakdown:
        "10 hrs/month researching + DMing + following up × $40/hr = ~$400/month. Plus the product cost of comping 5–10 creators per month (variable).",
      socialPerksLabel: "Social Perks Influencer",
      socialPerksCost: "$79/month + product",
      socialPerksBreakdown:
        "$79/month for the Influencer Marketplace tier. Same product cost, but conversions are tracked, creators are pre-vetted, and you ship a brief instead of starting cold each time.",
      honestNote:
        "If you have a great existing creator relationship, don't break it. Use software for new creator acquisition; keep your hand-built relationships hand-built.",
    },
    whenToStick: [
      "You already have 2–3 creator relationships that work well and you run ~1 campaign per month with them.",
      "Your product is so niche that no creator marketplace will match it (e.g., specialty industrial tools).",
      "You enjoy the cold-DM part and treat it as creative work — some founders genuinely do.",
    ],
    whenToSwitch: [
      "You want to run 3+ creator campaigns per month.",
      "You can't tell which past shoutouts drove sales.",
      "You're worried about FTC compliance (you should be — fines are real).",
      "Outreach has become a weekly time-sink instead of a fun part of the job.",
    ],
    migrationSteps: [
      {
        title: "Import your existing creator list",
        body:
          "Drop in a CSV of creators you've worked with (handle, what they got, when they posted). The system pre-fills their profile and tracks them as \"established relationships\" — they're already in your roster.",
      },
      {
        title: "Browse the marketplace and brief 5 new creators",
        body:
          "Filter by location, follower count, niche, and engagement rate. Pick 5, send a one-click brief with the perk you're offering. Replies typically arrive within 48 hours.",
      },
      {
        title: "Track conversions and double down",
        body:
          "After posts go live, each creator's dashboard shows clicks, redemptions, and revenue. Re-book the ones that converted; don't re-book the ones that didn't.",
      },
    ],
    faqs: [
      {
        q: "How are creators vetted in the marketplace?",
        a: "Manual review for fake-follower percentage (Modash data), engagement-rate floor (1.5%+), and post quality. About 30% of applicants are rejected. We re-check active creators quarterly.",
      },
      {
        q: "Can I bring my own creators in?",
        a: "Yes — and we encourage it. Existing creators import via CSV; they get a private invite link and become part of your roster. No marketplace fee on creators you bring in.",
      },
      {
        q: "Who handles FTC disclosure?",
        a: "The brief includes the required disclosure language (\"#ad\" or \"#sponsored\"), and the post-verification step checks that it's present before counting the post as completed. Non-compliant posts don't trigger the perk payout.",
      },
      {
        q: "What's the typical perk size?",
        a: "For a 1k–5k follower local creator: $30–80 in product or service value. For 5k–20k: $100–250. The marketplace shows benchmarks for your category so you don't over- or under-pay.",
      },
      {
        q: "What happens if a creator doesn't post?",
        a: "They don't get paid (or get the perk). The brief sets a deadline; missed deadlines auto-cancel. About 8% of creators no-show on first campaigns, which is industry standard.",
      },
      {
        q: "Can I run campaigns across Instagram, TikTok, and YouTube?",
        a: "Yes. Each creator profile lists the platforms they post on and minimum perk for each. Most campaigns run on Instagram + TikTok; YouTube and Shorts are growing.",
      },
    ],
  },

  // 7 — RUNNING PAID ADS YOURSELF
  {
    slug: "running-paid-ads-yourself",
    name: "running paid ads yourself",
    displayName: "Running Paid Ads Yourself",
    description:
      "Setting up Meta or Google ads in-house to acquire new customers.",
    category: "Customer acquisition",
    pros: [
      "It's the fastest way to test a new audience or offer. If your ad works, traffic shows up in hours, not weeks.",
      "It's measurable. Cost per click, cost per conversion, return on ad spend — the data is there for every dollar.",
      "Modern ad platforms have decent auto-optimization for small budgets. You don't have to be a Meta expert to break even on a $20/day budget.",
    ],
    cons: [
      "CAC keeps rising. The cost of a Facebook or Instagram click has roughly tripled for local businesses over the last 5 years.",
      "Most local ads are ignored — average click-through rate for a local-business Meta ad is 0.8–1.2%. You're paying for 100 impressions to get 1 click, and 1 click rarely becomes 1 customer.",
      "It's a treadmill. Stop spending and traffic stops. Word-of-mouth and organic compound; ads don't.",
      "Ad fatigue is brutal. Your best-performing ad on month one will be your worst-performing ad on month three.",
    ],
    differentiators: [
      "Customer-generated content costs you a perk, not a CPC. A customer posting on Instagram about your business is an ad that costs you $5 in service value instead of $5 in click cost.",
      "Word-of-mouth is measurable now. Referral codes, post-tracking, and creator dashboards mean you can quantify what used to be invisible.",
      "Reviews are the highest-ROI \"ad\" in local. Going from 12 to 50 Google reviews moves you up in local pack — which is permanent inventory, not a renting-the-spotlight motion.",
      "You don't compete with national brands' ad budgets. A local creator + a perk beats a national CPG ad budget in a 5-mile radius.",
      "Cost is bounded. Perks have a fixed value you set; ad spend has no ceiling unless you cap it manually.",
    ],
    mathExample: {
      diyLabel: "Self-run paid ads",
      diyCost: "~$1,000+/month",
      diyBreakdown:
        "$500/month minimum ad spend + 8 hrs/month managing/creative × $40/hr = ~$820/month for a serious effort. Typical CAC for a local-business Meta ad: $25–60 per acquired customer.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49–$79/month + perks",
      socialPerksBreakdown:
        "$49–$79/month + cost of perks redeemed (variable, but typically $200–500/month at scale). Typical effective CAC via perks-for-posts: $8–15 per new customer.",
      honestNote:
        "Paid ads are not dead. For new offers, new markets, or product launches, they're often the right tool. But for ongoing customer acquisition in a stable local market, word-of-mouth via perks usually wins on CAC.",
    },
    whenToStick: [
      "You're launching a new location, product line, or market and need volume fast.",
      "You have a clear funnel with strong conversion (booking link, e-commerce) where paid traffic converts predictably.",
      "Your category genuinely depends on search intent (urgent services like plumbing, towing, locksmiths) — Google search ads are gold here.",
    ],
    whenToSwitch: [
      "Your blended CAC is rising and ROAS is dropping month over month.",
      "You're spending $500+/month on ads with no clear positive ROI.",
      "You're a relationship business (salon, gym, restaurant) where word-of-mouth historically drove most growth.",
      "You'd rather invest in compounding assets (reviews, repeat customers, creator relationships) than rent attention.",
    ],
    migrationSteps: [
      {
        title: "Don't kill your ads yet — measure baseline",
        body:
          "Note your current monthly ad spend, customer count, and CAC. We'll come back to this in 90 days. Most businesses don't cut ads to zero; they cut by 50% and reinvest the rest.",
      },
      {
        title: "Launch a perk-for-post campaign",
        body:
          "Tell the AI agent your goal (\"more first-time customers\") and budget for perks. It generates the perk, the creator brief, and the customer-facing campaign. Live in 10 minutes.",
      },
      {
        title: "Reallocate at the 90-day mark",
        body:
          "Compare CAC: ads vs. perks vs. organic. Most businesses end up at ~30% paid, 40% perks-driven, 30% organic. Some go fully off paid; most don't.",
      },
    ],
    faqs: [
      {
        q: "Should I stop running ads entirely?",
        a: "Probably not. For most local businesses the right mix is ~30% paid ads (for search intent and net-new market) and ~70% perks/word-of-mouth (for repeat and referral). Going fully to one or the other is rarely the answer.",
      },
      {
        q: "How does effective CAC compare?",
        a: "Industry-typical: paid social CAC for local-business = $25–60/customer. Perk-for-post CAC = $8–15/customer. The catch: perks scale slower than ads in the first 60 days — you're trading speed for cost efficiency.",
      },
      {
        q: "What about Google Ads for high-intent search?",
        a: "Keep them. Google search ads convert at 6–12% for high-intent local queries — that's irreplaceable for businesses that win on \"who can fix my broken faucet right now.\" Use perks for retention and brand-building, not for emergency-need acquisition.",
      },
      {
        q: "Do perks-for-posts actually drive new customers?",
        a: "Yes, with measurement. A typical perk-for-post creator (1k–3k followers) drives 3–8 new customers per post, depending on niche fit. Multi-post campaigns compound — the second post from the same creator usually outperforms the first.",
      },
      {
        q: "What's the time investment vs. running ads?",
        a: "Ads: 5–10 hrs/month for ongoing creative + optimization. Perks: 1–2 hrs/week reviewing posts and approving payouts. Once running, perks need less ongoing attention than ads.",
      },
      {
        q: "Can I track perk-driven revenue the way I track ad ROAS?",
        a: "Yes. Every perk has an attribution code that flows through your POS or e-commerce. The dashboard shows revenue per perk, per creator, per campaign — analogous to ROAS but for the perk economy.",
      },
    ],
  },

  // 8 — WORD-OF-MOUTH ONLY
  {
    slug: "word-of-mouth-only",
    name: "word-of-mouth only",
    displayName: "Pure Word-of-Mouth",
    description:
      "Relying entirely on customers organically telling their friends about you.",
    category: "Customer acquisition",
    pros: [
      "It's the highest-trust source of new customers — referred customers convert 3–5x better than ad-acquired ones.",
      "It's free in the obvious sense. No software, no ad spend, no creator payouts.",
      "It signals real product-market fit. If word-of-mouth alone keeps you growing, you're doing something genuinely worth talking about.",
    ],
    cons: [
      "It's unpredictable. Some months bring 30 referrals, some bring 3, and you have no idea why.",
      "It plateaus. There's a ceiling — your customers' networks are finite, and they'll only mention you so often without a nudge.",
      "There's no compounding mechanism. A happy customer in 2025 doesn't keep referring people in 2026 unless you re-activate them.",
      "You can't tell who your referrers are. Your top 5 advocates are doing 80% of the work and you don't know their names.",
    ],
    differentiators: [
      "Identify your top referrers by name and reward them. A small annual thank-you turns 1 referral/year into 4.",
      "Lightweight referral mechanic: customer shares a link, gets a perk when their friend visits, friend gets a welcome perk. Compounds without being pushy.",
      "Make sharing easy and trackable. \"Click this link, send to friends\" beats \"hey, tell people about us.\"",
      "Reactivate dormant referrers. A customer who referred 3 friends in year one usually has 2–3 more in them — but only with a nudge.",
      "Measure word-of-mouth as a number. Referral rate, referrer concentration, average referrals per referrer — once it's measurable, it's improvable.",
    ],
    mathExample: {
      diyLabel: "Word-of-mouth only",
      diyCost: "Free, but unmeasured",
      diyBreakdown:
        "Total cost: $0/month. But you can't answer \"how many of my customers came from referrals?\" — which means you can't double down on what's working.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + perks",
      socialPerksBreakdown:
        "$49/month + variable perk cost. Most businesses see 2–4x lift in referral volume in the first 90 days. At $40 average revenue/referred customer, payback is usually 1–2 months.",
      honestNote:
        "If word-of-mouth is genuinely thriving without help, don't over-engineer it. Add a lightweight tracking layer first; only add perks if growth flattens.",
    },
    whenToStick: [
      "Your referral rate is genuinely strong (~30%+ of new customers come from existing ones) and growing.",
      "Your business is so high-end or boutique that any explicit referral program feels off-brand.",
      "You serve a tight-knit community where everyone already knows everyone — explicit incentives can feel transactional.",
    ],
    whenToSwitch: [
      "You can't answer \"what % of customers come from referrals?\"",
      "Growth has plateaued and you don't know whether word-of-mouth is healthy or dying.",
      "You'd like to formally thank top referrers but don't have a way to identify them.",
      "You're scaling locations or hiring and want a more predictable acquisition channel.",
    ],
    migrationSteps: [
      {
        title: "Turn on tracking-only mode for 30 days",
        body:
          "Each existing customer gets a unique share link. No public referral push, no rewards yet — just measurement. You'll discover who your real referrers are.",
      },
      {
        title: "Thank your top 10 referrers personally",
        body:
          "After 30 days the dashboard shows your top referrers. Send each one a personal note + a thank-you perk. Don't make it transactional — make it grateful. This alone typically lifts year-2 referral rate.",
      },
      {
        title: "Add a soft public referral perk",
        body:
          "Once you have data, layer in the referral perk. Keep it small ($10 credit, not 50% off) to avoid changing the texture of the relationship. The point is the social ritual, not the discount.",
      },
    ],
    faqs: [
      {
        q: "Won't paying for referrals cheapen the word-of-mouth?",
        a: "It can — which is why the default perk is small. Research on referral programs shows that customers refer for status and helpfulness, not the reward. The perk is a permission slip, not a payment. Keep it small and on-brand.",
      },
      {
        q: "What's a healthy referral rate?",
        a: "For local services and hospitality: 20–35% of new customers via referrals is healthy. Below 15% suggests the offering isn't generating word-of-mouth; above 50% suggests you're under-marketing other channels.",
      },
      {
        q: "Can I run this without rewarding the referrer at all?",
        a: "Yes — many businesses do tracking-only mode permanently. You measure, you thank top referrers privately, and you skip the perk. Works well for premium brands.",
      },
      {
        q: "What if my customers refuse to share a link?",
        a: "About 60% of customers won't share, and that's fine. The 40% who do generate 5–10x more referrals than they would have organically. You're optimizing the willing referrers, not converting the reluctant ones.",
      },
      {
        q: "Does this work for B2B referrals?",
        a: "Same mechanic, different texture. B2B perks tend to be account credits or service hours rather than discounts. The measurement layer is the same.",
      },
      {
        q: "What about review-based word-of-mouth?",
        a: "Reviews are word-of-mouth at scale. The same platform handles both — referrals are 1-to-1, reviews are 1-to-many. Most businesses run both motions in parallel from day one.",
      },
    ],
  },

  // 9 — PRINTABLE FLYERS
  {
    slug: "printable-flyers",
    name: "printable flyers",
    displayName: "Printable Flyers",
    description:
      "Designing, printing, and distributing paper flyers to promote offers.",
    category: "Customer outreach",
    pros: [
      "Physical presence matters. A flyer on a community bulletin board or coffee-shop counter reaches people who aren't on your email list yet.",
      "Local discovery is real. People who live near you and don't follow your Instagram still see a flyer in their hand at a farmer's market.",
      "Production cost is low. A few hundred flyers run $30–50 at any local print shop.",
    ],
    cons: [
      "There's no measurement. You handed out 500 flyers — did 5 customers come? 50? You'll never know.",
      "Distribution is unrewarded labor. Someone has to actually put the flyers out, and that someone is usually you on a Sunday.",
      "They date instantly. \"Spring promo, runs through April 15\" — by April 16, those flyers are litter.",
      "Reach is geographically tiny. A 500-flyer run might cover 4 blocks. Compared to a single Instagram post, the reach math doesn't work.",
    ],
    differentiators: [
      "QR-code-on-flyer hybrid: keep the physical presence, but route every scan through a tracking link. You finally know what each location/flyer/event drove.",
      "Customers get a perk in exchange for following + posting — turning each scan into compounding social proof, not just a single visit.",
      "Refreshable offers. Your evergreen flyer points to a URL whose offer you can change without re-printing.",
      "Distribution becomes optional. Most of what flyers did (\"announce a thing\") happens on social and SMS for less effort and more reach.",
      "Print integration: when you do want a flyer, generate a QR-coded PDF from the dashboard in 30 seconds.",
    ],
    mathExample: {
      diyLabel: "Printable flyers",
      diyCost: "~$150–300/month",
      diyBreakdown:
        "$50/month in print costs + 3 hrs/month designing + distributing × $40/hr = ~$120/month. Plus the cost of running an unmeasured channel.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + optional print",
      socialPerksBreakdown:
        "$49/month. If you keep printing flyers, generate them from the dashboard with tracking QR codes (same print cost, way better data).",
      honestNote:
        "Don't abandon physical presence — counter signs and farmer's-market flyers genuinely work. Just measure them.",
    },
    whenToStick: [
      "You operate in a tight neighborhood where the same 100 people you want to reach really do walk past the bulletin board.",
      "You serve a demographic with low smartphone use (e.g., senior-focused services).",
      "Your business depends on event-based foot traffic (farmer's markets, festivals) where a physical handout converts.",
    ],
    whenToSwitch: [
      "You're printing flyers but can't say whether they're working.",
      "Your audience is online and on phones — you're just maintaining the flyer habit out of inertia.",
      "Distribution is starting to feel like a chore.",
      "You want to A/B test offers and don't want to reprint every time.",
    ],
    migrationSteps: [
      {
        title: "Generate a QR-coded version of your current flyer",
        body:
          "Upload your flyer or use a template. Add a QR code that links to a perk landing page (\"Scan for $10 off your first visit\"). Print at your usual shop or download the PDF.",
      },
      {
        title: "Place 3 versions in 3 different spots",
        body:
          "Each location gets a unique QR code. After 2 weeks the dashboard shows scans, redemptions, and revenue by location. You'll know which bulletin board is worth re-stocking.",
      },
      {
        title: "Shift the offer online",
        body:
          "Most businesses find that 60–80% of \"flyer reach\" is replaceable with one Instagram post and an SMS to existing customers. Keep printing for the venues that genuinely convert; drop the rest.",
      },
    ],
    faqs: [
      {
        q: "Can I still design flyers myself?",
        a: "Yes. Use Canva, your designer, or the built-in template — Social Perks just adds the tracking QR code. Your creative process doesn't change.",
      },
      {
        q: "What if customers don't scan QR codes?",
        a: "Post-COVID, ~60% of US adults regularly scan QR codes. For demographics that don't, include the URL as a backup and accept a lower-but-still-positive scan rate.",
      },
      {
        q: "How long should I keep running paper flyers?",
        a: "If a location's tracking shows positive ROI (perk cost + print cost < revenue driven), keep going. If it's negative for 60+ days, redirect that money to social or SMS.",
      },
      {
        q: "What about door-to-door flyer drops?",
        a: "Generally not worth it for most businesses — typical scan rate is under 0.5%, and many municipalities prohibit it without permits. Counter-top and partner-business placement is usually 10x more efficient.",
      },
      {
        q: "Can I run different offers from the same flyer design?",
        a: "Yes. The QR code points to a URL whose offer you control. Change the offer monthly without reprinting.",
      },
      {
        q: "What's a realistic scan rate?",
        a: "For partner-counter placement: 2–8% of customers who see the flyer scan it. For events: 5–15%. For mail drops: under 1%. Use these as benchmarks for your own data.",
      },
    ],
  },

  // 10 — TEXT BLAST SERVICES
  {
    slug: "text-blast-services",
    name: "a text-blast service",
    displayName: "Text-Blast Services",
    description:
      "Using a basic SMS tool (EZTexting, SimpleTexting, etc.) to mass-message customers.",
    category: "Customer outreach",
    pros: [
      "SMS open rates are real — 95%+ open rates regardless of which tool you use.",
      "Basic blast tools are cheap. $25–50/month for a few thousand sends covers a lot of local businesses.",
      "It's simple. Write a message, pick the list, hit send. No funnel diagrams or marketing-ops thinking required.",
    ],
    cons: [
      "It's one-way. The customer can't \"do anything\" with the message besides read it — and most pure-blast tools don't track what they do next.",
      "List-building is manual. You have to add phone numbers one at a time or pay extra for integrations.",
      "Most blast tools don't enforce compliance well. TCPA fines for non-consented sends start at $500/message and have wrecked small businesses.",
      "There's no loyalty layer. Every send is a fresh ask — \"come buy something\" — with no reward mechanic to make the customer feel like they're getting something for engaging.",
    ],
    differentiators: [
      "SMS + perks integrated: every message is also an earning opportunity. \"Reply YES + visit Tuesday = $10 credit\" beats \"sale Tuesday\" by 3–5x.",
      "Compliance is built-in. Every opt-in is logged, every message includes STOP language, and the audit trail is automatic.",
      "Two-way conversations land in a shared inbox. When a customer replies, your team answers from a phone — not from an automated dead-end.",
      "AI drafts the message based on your goal. \"Fill Tuesday at 6pm\" generates a specific, on-brand SMS in 30 seconds.",
      "Cross-channel: same audience, same dashboard, also runs Instagram DM, email, and on-site perks — instead of being one channel-specific tool.",
    ],
    mathExample: {
      diyLabel: "Text-blast service",
      diyCost: "~$50–150/month",
      diyBreakdown:
        "$30/month SMS tool + $20/month per integration + ~2 hrs/month writing/scheduling messages × $40/hr = ~$110/month for a mid-volume sender.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49–$79/month",
      socialPerksBreakdown:
        "$49–$79/month, includes equivalent SMS volume + perks + reviews + email + creator marketplace. Same channel, more layers.",
      honestNote:
        "If you only want SMS blasts and nothing else, a dedicated tool may be a few dollars cheaper. Once you'd benefit from perks, reviews, or referrals, the bundled tool usually wins on total cost.",
    },
    whenToStick: [
      "You send 1 SMS/month or less and don't need anything beyond a basic blast.",
      "You already use a dedicated SMS tool deeply integrated with your CRM and the switching cost is high.",
      "Your SMS use case is truly single-purpose (e.g., appointment reminders only) with no growth motion attached.",
    ],
    whenToSwitch: [
      "You're sending 4+ SMS campaigns/month and want them to drive measurable action, not just \"hi.\"",
      "You're paying separately for SMS, reviews, and loyalty — and consolidation would simplify life.",
      "You've gotten a TCPA scare and want stronger compliance defaults.",
      "Your SMS list is plateauing and you want a growth motion (perks-for-opt-in) attached to it.",
    ],
    migrationSteps: [
      {
        title: "Export your contacts and consent records",
        body:
          "From your current SMS tool, export the contact list including opt-in date and source. Consent records are what matter — without them, the new tool can't legally message your old list.",
      },
      {
        title: "Import with consent verification",
        body:
          "Drop the CSV. The import wizard validates that each contact has an opt-in source on record. Contacts without verified consent get a one-time re-permission message before they're activated.",
      },
      {
        title: "Send your first AI-drafted campaign",
        body:
          "Tell the AI your goal, pick the audience, approve the draft. The first send goes out in under 10 minutes and includes built-in STOP language and frequency capping.",
      },
    ],
    faqs: [
      {
        q: "What about my SMS short code or 10DLC registration?",
        a: "If you have a registered 10DLC or short code, we can either migrate it (typical 5–10 business day process with the carrier) or you can run on our shared number while waiting. New 10DLC registration takes 2–4 weeks regardless of vendor.",
      },
      {
        q: "Will my opt-in audience need to re-consent?",
        a: "Only contacts whose consent source isn't documented. If your current tool has clean opt-in records, all of them transfer cleanly. About 10–20% of typical small-business lists need re-permission.",
      },
      {
        q: "How does compliance enforcement actually work?",
        a: "Every message gets a STOP suffix automatically. Frequency cap (default 4/month per customer, adjustable) prevents accidental over-messaging. STOP replies immediately suppress that contact across all channels, with audit log.",
      },
      {
        q: "Can I still send simple promotional blasts?",
        a: "Yes. The blast flow is one of the supported flows — pick audience, type message, schedule. The difference is you can also layer in perks and tracking without switching tools.",
      },
      {
        q: "What if I want to keep my dedicated SMS tool?",
        a: "That's fine. Social Perks integrates with most SMS tools (Twilio, EZTexting, Heymarket) and pulls engagement data without taking over the send. You'd use it for the perks/reviews/creator layer only.",
      },
      {
        q: "Does the new tool handle MMS (images in texts)?",
        a: "Yes. MMS counts as 3 SMS in your plan quota (industry standard) and works for product photos, QR codes, and event flyers.",
      },
    ],
  },

  // 11 — YELP DEALS
  {
    slug: "yelp-deals",
    name: "Yelp Deals",
    displayName: "Yelp Deals",
    description:
      "Running promotional offers through Yelp's Deals product to attract new customers.",
    category: "Promotional offers",
    pros: [
      "You reach people who are already looking. Yelp users have high purchase intent — they're searching for a place to eat or a service to book right now.",
      "Setup is fast. Deals can go live in minutes from the Yelp business dashboard.",
      "Yelp handles the redemption flow. Customers buy the deal in-app; you scan a code. No tracking infrastructure required.",
    ],
    cons: [
      "Yelp takes 30% of every deal sold. After payment processing, your net is around 65% of the deal price — and the deal is already discounted.",
      "Most deal buyers are one-time customers. Industry data shows 70–80% of deal redeemers never return as full-price customers.",
      "You don't own the customer relationship. Yelp keeps the email and phone number; you get a name and a redemption.",
      "Deal-conditioned customers are price-shoppers. Once you've trained your local audience that you discount on Yelp, removing the deal is hard.",
    ],
    differentiators: [
      "You own the customer relationship. Phone number, email, perk history — all yours, not platform-mediated.",
      "Deal economics flip. Instead of paying 35%+ in platform fees, you spend ~10–20% on the perk itself, full margin to you.",
      "Stack a perk with content. \"Show this text + post a story = lunch discount\" — you get a customer AND social proof, not just a transaction.",
      "Repeat-conditioning. Perks tied to a 2nd, 3rd, 4th visit retain the customer instead of feeding the deal-hopper cycle.",
      "Cross-channel reach. Same offer can run via SMS, Instagram, your Google Business page, and your widget — not locked inside Yelp's app.",
    ],
    mathExample: {
      diyLabel: "Yelp Deals",
      diyCost: "~30% platform fee per deal",
      diyBreakdown:
        "Sell a $50 deal for $25. Yelp takes ~30% ($7.50) + payment processing (~3%, $0.75). Your net: $16.75. You also delivered $50 of value — gross margin matters here, but most deal-takers don't return at full price.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + perk cost",
      socialPerksBreakdown:
        "$49/month flat. Offer a $10 perk in exchange for a visit + social post. Customer pays full price; you keep 100% of the revenue minus the perk cost. Effective \"acquisition cost\" of perks: ~10–20% of first visit.",
      honestNote:
        "If your goal is short-term butts-in-seats during a soft week, Yelp Deals work. If your goal is to acquire customers who'll return, the math is rough.",
    },
    whenToStick: [
      "You have urgent excess capacity (a new restaurant on a Tuesday night) and need bodies in the door this week.",
      "You're in a category where Yelp is genuinely the primary discovery channel (some niche services and hospitality markets).",
      "You're running a one-off liquidation (closing inventory, ending a service line) and won't be repeat-acquiring these customers anyway.",
    ],
    whenToSwitch: [
      "Deal-bought customers aren't returning at full price.",
      "You're running Yelp Deals as ongoing acquisition, not occasional capacity-fill.",
      "Your margins are being eroded by platform fees.",
      "You'd benefit from owning customer contact info instead of leaving it with Yelp.",
    ],
    migrationSteps: [
      {
        title: "Wind down active Yelp Deals to their expiration",
        body:
          "Don't kill running deals — let buyers redeem what they paid for. Just stop creating new ones. Most businesses wind down over 30–60 days.",
      },
      {
        title: "Set up a perk-for-action replacement",
        body:
          "The closest one-to-one swap: a perk that requires a small customer action (review, post, referral) in exchange for the discount. Customer effort replaces the platform's fee.",
      },
      {
        title: "Promote the perk where Yelp Deals were promoted",
        body:
          "Add a counter sign, update your Google Business profile, and announce via SMS to your existing list. Most businesses recover the deal-driven volume in 30–45 days.",
      },
    ],
    faqs: [
      {
        q: "Will I lose Yelp visibility if I stop running deals?",
        a: "Yelp's algorithm gives slight ranking boost to active-deal businesses, but the effect is small. Far more impactful: your overall review count and recency. Most businesses don't see meaningful ranking loss.",
      },
      {
        q: "Can I still respond to Yelp reviews?",
        a: "Yes. Stopping Deals doesn't affect your Yelp business page, reviews, or response capability. Most businesses run both: Yelp for organic presence, Social Perks for outbound and loyalty.",
      },
      {
        q: "What about repeat customers I acquired via Yelp Deals?",
        a: "You can re-engage them — but only if you have their contact info, which Yelp's deal flow doesn't always share. The honest answer: most deal-acquired customers without contact info are lost.",
      },
      {
        q: "Is it worth keeping a small Yelp Deals presence?",
        a: "For some categories yes — particularly entertainment, hospitality, and one-time-experience services. For most local services with repeat customers (salons, fitness, restaurants), the long-term math favors fully replacing it.",
      },
      {
        q: "How is perk-for-post different from Yelp Deals?",
        a: "Yelp Deals discount to acquire. Perk-for-post discounts to acquire AND generate content. Same customer gets a similar value, but you also get an Instagram story, a Google review, or a referral as part of the exchange.",
      },
      {
        q: "What's the typical repeat-customer rate?",
        a: "Yelp Deal repeat rate (deal customer returns at full price): 15–25%. Perk-for-post repeat rate (perk customer returns at full price): 40–55%. The action-based mechanic seems to attract less price-driven customers.",
      },
    ],
  },

  // 12 — GROUPON DISCOUNTS
  {
    slug: "groupon-discounts",
    name: "Groupon discounts",
    displayName: "Groupon Discounts",
    description:
      "Running deeply discounted (50%+) offers on Groupon to attract new customers.",
    category: "Promotional offers",
    pros: [
      "Volume is real. A featured Groupon for a local business often sells hundreds of vouchers in a single weekend.",
      "Cash hits your account fast (relative to the redemption window). For a cash-strapped new business, that lump-sum can fund inventory or runway.",
      "Groupon's reach is genuinely massive. Their email list and SEO presence pulls people who'd never find you organically.",
    ],
    cons: [
      "The economics are punishing. Typical Groupon split: you discount 50%, then Groupon takes 50% of what's left. Net: ~25% of the original price.",
      "Groupon-trained customers are the lowest-LTV cohort in local commerce. Industry data: 20–35% return at full price, vs. 55–70% for organically-acquired customers.",
      "Voucher redemption strain. 200 redemptions land in a 30-day window and burn out your staff and inventory.",
      "Brand damage is real. Being on Groupon signals \"discount-driven\" to local audiences and can repel premium customers.",
    ],
    differentiators: [
      "You set the discount and the rules. No 50/50 split with a platform — you keep your full margin.",
      "Customers come because of a relationship mechanic (review, post, referral), not a deep discount — they self-select toward higher LTV.",
      "Volume is metered, not flash-flooded. You can cap perks at 20/day instead of getting hit with 300 Groupon redemptions in one weekend.",
      "Customer contact info is yours. You can re-engage them at full price 30, 60, 90 days later.",
      "Brand stays premium. A perk for a social action reads differently than a 50%-off voucher on Groupon.",
    ],
    mathExample: {
      diyLabel: "Groupon",
      diyCost: "~75% of revenue lost per redemption",
      diyBreakdown:
        "$100 service sold as a $50 Groupon. Groupon keeps $25. You receive $25 and deliver $100 of service. Cost of acquisition: $75 + service cost. Repeat rate at full price: 20–35%.",
      socialPerksLabel: "Social Perks",
      socialPerksCost: "$49/month + perk cost",
      socialPerksBreakdown:
        "$49/month + ~$10–20 perk per acquired customer. Customer pays $80–90 of the original $100 (perk is partial), you keep $85+ vs. Groupon's $25. Repeat rate at full price: 40–55%.",
      honestNote:
        "Groupon makes sense in exactly one situation: you have so much idle capacity that even a $25 net redemption is incremental margin. For most healthy businesses, the brand cost outlasts the cash benefit.",
    },
    whenToStick: [
      "You're in launch mode and need awareness more than margin — a one-time Groupon for a brand-new business can work.",
      "You have unsold capacity that has zero alternative use (a half-empty class, an unbooked Tuesday). Even $25 is incremental.",
      "You're in a category where Groupon is the dominant local channel and you can run it as a one-off promo, not a habit.",
    ],
    whenToSwitch: [
      "You're running Groupon more than 1–2 times per year.",
      "Your full-price customers complain about \"why didn't I get the Groupon price?\"",
      "Repeat rates from Groupon customers are below 25%.",
      "You'd prefer to attract relationship-driven customers, not price-driven ones.",
    ],
    migrationSteps: [
      {
        title: "Let active Groupon vouchers ride out",
        body:
          "Honor the vouchers that are out there — usually 6–12 month redemption windows. Just don't run new ones. You're not breaking anything; you're stopping the next one.",
      },
      {
        title: "Replace with perk-for-action acquisition",
        body:
          "Set up the equivalent acquisition perk: \"first visit + post = 25% off,\" \"first review + referral = $20 credit.\" Same first-visit incentive, but you keep the margin and the customer info.",
      },
      {
        title: "Reactivate your Groupon-acquired customers",
        body:
          "If you captured contact info from past Groupon redemptions, run a one-time SMS reactivation campaign at a smaller (10–15%) discount. Conversion is typically 5–10% — modest, but meaningful for a free re-engagement.",
      },
    ],
    faqs: [
      {
        q: "How long should I wait between my last Groupon and my new acquisition motion?",
        a: "About 30 days, mostly so your existing customer base doesn't see the Groupon and the new perk simultaneously. After 30 days the audiences feel distinct.",
      },
      {
        q: "What if I genuinely need Groupon's volume to fill capacity?",
        a: "Then run it as a planned 1–2 times per year tactic — not a recurring acquisition motion. Use the volume burst, capture as much contact info as possible, and re-engage at full price within 30 days.",
      },
      {
        q: "Can I capture customer contact info from Groupon redemptions?",
        a: "Partially. Groupon shares limited customer data, but you can request name + email at redemption (most customers will give it). Build a process at your point-of-sale to capture phone too if possible.",
      },
      {
        q: "Why does perk-for-action outperform deep discounting?",
        a: "Deep discounts attract price-driven customers (low LTV). Action-based perks attract customers willing to do something for value, which is a different psychographic with 2–3x higher repeat rates. Same first-visit volume, very different second-visit behavior.",
      },
      {
        q: "What's a realistic timeline to replace Groupon volume?",
        a: "Most businesses replace ~60–80% of Groupon-driven volume within 60–90 days, and exceed it by month 4 — because perk customers refer at much higher rates than Groupon customers do.",
      },
      {
        q: "Will my Groupon listing hurt my Google ranking once I'm on Social Perks?",
        a: "No direct effect. But long-term, having an active Groupon listing signals to Google that you discount heavily, which can affect local-pack positioning. Many businesses sunset their Groupon presence entirely 60+ days after switching.",
      },
    ],
  },
];

export function getDIYMethod(slug: string): DIYMethod | undefined {
  return DIY_METHODS.find((m) => m.slug === slug);
}

export function getOtherDIYMethods(slug: string, count = 4): DIYMethod[] {
  return DIY_METHODS.filter((m) => m.slug !== slug).slice(0, count);
}
