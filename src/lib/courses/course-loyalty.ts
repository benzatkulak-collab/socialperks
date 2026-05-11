import type { Course } from "./types";

export const LOYALTY_COURSE: Course = {
  slug: "5-day-customer-loyalty",
  title: "Build a Loyalty Program That Actually Drives Repeat Visits",
  subtitle: "A 5-day plan to design, launch, and run a loyalty program that pays for itself in 30 days",
  duration: "5 days",
  audience: "small business owners",
  outcome: "Launch a loyalty program that increases your repeat visit rate by 25-40% and your average customer lifetime value by 30%.",
  capstone: "Enroll your first 50 customers into your new loyalty program using the in-store script and digital enrollment flow from Day 5.",
  lessons: [
    {
      day: 1,
      subject: "Why every punch card you've ever made has failed",
      cta: "Calculate your current repeat visit rate using the formula in this email. Write down the single biggest reason customers don't come back a second time.",
      body: `If you've owned a small business for more than two years, you've probably tried a loyalty program. A punch card, a stamp card, a digital app, a points system. And you probably let it die quietly within 6 months because it wasn't moving the needle. You are not alone — 73% of small business loyalty programs are abandoned within their first year. The good news: the failure pattern is consistent, and so is the fix.

Why most loyalty programs fail:

1. The reward is too far away. "Buy 10, get 1 free" requires 10 visits to see value. Most customers visit 2-3 times before deciding whether a place is "their place." You need a reward they can taste in the first 2 visits.

2. The redemption is friction-heavy. Lost punch cards, forgotten apps, dead phones. Every step between earning and redeeming kills the loop. Loyalty needs to feel automatic.

3. The math doesn't make sense. Owners give away too much, too soon, hoping to drive traffic. Then they realize they're losing 20% margin per visit and quietly stop honoring the program.

4. The program treats all customers the same. Your top 10% of customers spend 5-7x more than your bottom 50%. Treating them identically misses the leverage.

5. No one knows about it. The card is on the counter but the cashier never mentions it. Half your customers don't know you have a program.

Here is the 5-day roadmap:
- Day 1 (today): Diagnose your repeat business — math you've probably never done
- Day 2: The tier structure — three levels that work for 90% of businesses
- Day 3: Reward design — the rewards customers care about vs. what owners think they want
- Day 4: Enrollment and tracking — the actual operational mechanics
- Day 5: Launch checklist, scripts, and your first 30 days

Today's math. Most owners do not know their repeat visit rate. They feel it. Today we measure it.

Definition: repeat visit rate = customers who visited 2+ times in the last 90 days / total unique customers in the last 90 days.

How to calculate without fancy software:
- If you have a POS with customer accounts (Square, Toast, Clover), pull the report directly
- If you use OpenTable, check the repeat customer report
- If you have neither, pull your last 200 transactions and count unique credit card numbers (the last 4 digits work as a proxy — same last 4 = likely same customer)

Average repeat rate by category:
- Coffee shops: 65-75%
- Casual restaurants: 30-45%
- Fine dining: 15-25%
- Salons/barbers: 60-80%
- Yoga/fitness studios: 40-55%
- Retail boutiques: 25-40%

If you're below average for your category, you have a retention problem that a loyalty program can directly fix. If you're at or above average, the loyalty program will compound your existing strength.

The 2x rule. The most leveraged improvement in any small business is moving a one-time visitor to a two-time visitor. Why: after a second visit, the probability of a third visit jumps from 27% to 54%. After a third visit, it's 70%. Repeat visits compound. The hardest gap is between visit 1 and visit 2, and a loyalty program is the highest-leverage tool for closing it.

What to write down today:
- Your repeat visit rate (from the math above)
- The single biggest reason customers don't come back a second time (your gut answer is usually right)
- The reward you'd be willing to give to convert a one-time visitor into a two-time visitor

Hold onto these answers — we'll use them tomorrow when we design the tier structure.

One final thought before tomorrow. Loyalty programs are not just about retaining customers — they're about identifying your best customers. Once you know who your top 10% are, every other marketing decision gets easier. You know who to invite to soft launches, who to ask for reviews, who to feature on social media, who to call when business is slow. The program is a side effect; the data is the prize.

Tomorrow: the tier structure. We'll cover why three tiers always outperform punch cards and how to set the thresholds so that 60% of customers reach tier 1, 20% reach tier 2, and 5% reach tier 3.`,
    },
    {
      day: 2,
      subject: "Three tiers, three thresholds: the structure that works for 90% of businesses",
      cta: "Set your three tier thresholds today. Write them on a Post-it and stick them next to your register.",
      body: `Yesterday you measured your repeat rate. Today we design the tier structure that's going to move it. We will use a three-tier system because it's the only structure that:

1. Gives customers a reward fast enough to hook them
2. Creates aspirational progression for medium customers
3. Recognizes VIPs without bankrupting you
4. Is simple enough that customers and staff actually understand it

The three tiers:

Tier 1: Welcome (every customer who enrolls)
- Reward: small, immediate, low-cost
- Threshold: enrollment only
- Goal: hook them into the program in their first visit

Tier 2: Regular (3-5 visits or $50-$150 spend in 90 days)
- Reward: medium, status-signaling
- Threshold: realistic for a typical regular
- Goal: move customers from "visited a few times" to "this is my place"

Tier 3: VIP (10+ visits or $300+ spend in 90 days, or annual amount)
- Reward: large, experience-based, exclusivity-based
- Threshold: only your real top customers reach this
- Goal: deepen the relationship with people already worth 5-10x your average customer

Setting your thresholds. Here is the simple way:

Step 1: Look at your top 10% of customers from the last 90 days. What did the lowest-spending customer in that group spend? That's your Tier 3 threshold.

Step 2: Look at the top 30% of customers. What did the lowest-spending customer in that group spend? That's your Tier 2 threshold.

Step 3: Enrollment is automatic for tier 1 — anyone in the program.

Example for a coffee shop:
- Average ticket: $6.50
- Top 10% spend $300+ in 90 days
- Top 30% spend $100+ in 90 days
- Tier 1 threshold: enrollment
- Tier 2 threshold: $100 in 90 days (~15 visits)
- Tier 3 threshold: $300 in 90 days (~45 visits, i.e., daily regulars)

Example for a salon:
- Average ticket: $85
- Top 10% spend $850+ in 90 days
- Top 30% spend $300+ in 90 days
- Tier 1: enrollment
- Tier 2: $300 in 90 days (~4 visits)
- Tier 3: $850 in 90 days (~10 visits)

Why visits vs. spend. Use whichever metric your customer naturally tracks. Coffee shop customers think in visits. Salon customers think in dollars. Match the metric to how the customer thinks.

The 60-20-5 distribution check. After a well-designed program runs for 90 days, this is what you should see:
- 60% of enrolled customers reach Tier 1 (basically everyone — it's free)
- 20% reach Tier 2 (your regulars)
- 5% reach Tier 3 (your VIPs)

If your numbers are wildly different — say 50% reach Tier 3 — your thresholds are too low and you're giving away margin. If under 5% reach Tier 2, your thresholds are too high and customers will quit before reaching the reward.

The naming layer. Don't name them "Tier 1, Tier 2, Tier 3." That's accountant talk. Use names that match your brand:
- Generic: Member / Regular / VIP
- Coffee shop: Sip / Brew / Roast
- Restaurant: Friend / Local / Insider
- Salon: Member / Stylist's Pick / Studio Circle
- Yoga: Practitioner / Devotee / Sangha
- Boutique: Shopper / Stylist / Front Row

Names matter because customers feel them. "VIP" is generic. "Front Row" sounds exclusive in a way that makes a person want to be it. Spend 10 minutes today picking three names that fit your brand voice.

The status visibility rule. Tier status only matters if it's visible. Customers should know what tier they're in every time they visit. Three ways to surface it:

1. In your POS — the customer's tier shows up when their card swipes or email is entered
2. On their receipt — printed in the footer ("Tier 2 / Regular")
3. In email — every transactional email mentions their tier

Without visibility, the program is invisible to the customer and they won't behave differently.

The grace period. Set a 30-day downgrade grace period. If a Tier 3 customer drops below the threshold for one quarter, don't downgrade them immediately — give them 30 days to come back. This dramatically reduces the negative "you took away my status" emotion and gives you a natural reason to send a "we miss you" email.

Tomorrow: rewards. The biggest mistake owners make is offering rewards customers don't actually want. We'll cover what customers say they want vs. what they actually use, and why "free product" is rarely the best reward.`,
    },
    {
      day: 3,
      subject: "The rewards customers care about (and the ones they ignore)",
      cta: "Design your three reward menus today using the framework in this email. Calculate the cost of each reward and make sure your blended margin stays above 20%.",
      body: `Most loyalty programs use "free product" as the reward. Buy 10 coffees, get one free. The 11th coffee is free. This works, sort of, but it's leaving 60% of the value on the table. Today we cover what actually moves customer behavior.

There are four reward categories, in order of how much they move behavior per dollar spent:

1. Experiential rewards. Things money can't easily buy. Highest impact per dollar.
2. Status rewards. Recognition, exclusivity, "first dibs." High impact.
3. Discount rewards. Percentage off. Moderate impact.
4. Free product rewards. The free thing. Lowest impact per dollar — surprising but true.

Why free products underperform. When you give a customer a free $5 coffee, you assume they value it at $5. Research consistently shows they value free items at 40-60% of retail. Your $5 coffee feels like $2-3 of value. Meanwhile, an experiential reward — say, a hand-written thank-you card from the owner — costs you $0.50 in time and 5 cents in postage but feels like $10 of value. That's a 20x leverage ratio.

This doesn't mean don't ever give free products. It means don't lead with them.

Tier 1 reward menu (enrollment — must be immediate and feel like a real welcome):

Good options:
- A small experiential perk on first visit: "Sit at the bar and we'll explain the menu," "Get the lay of the salon and meet our team"
- A surprise add-on with their first order ("we threw in a cookie")
- Birthday rewards (you collect birthdate at enrollment, send a free item on their birthday)
- Early access to a newsletter with new arrivals or specials

Cost target: under $5 per enrolled customer. The goal is hook, not give away the store.

Tier 2 reward menu (regulars — must feel meaningfully better than Tier 1):

Good options:
- Free [signature item] every 5-10 visits (this is your traditional reward — fine but not the only thing)
- "Skip the line" or "reserve a regular table" privileges
- Members-only menu items (a secret dish only Tier 2+ can order)
- 10% off the second item on every visit (encourages multi-item orders)
- Quarterly tasting/preview event invitation
- Free upgrade ("any size for the price of small")

Cost target: 8-12% of the customer's average ticket. If your average ticket is $20, the reward should cost you $1.60-$2.40 to deliver. That keeps your margin healthy while feeling generous.

Tier 3 reward menu (VIPs — should be obviously special):

Good options:
- Annual gift from the owner (not a coupon — an actual thoughtful gift)
- First access to limited drops, reservations, appointments
- Personal stylist/server/barista who knows their preferences
- Exclusive invite to a quarterly VIP-only event (small dinner, private class, pre-sale night)
- Custom or off-menu items
- A drink/dish named after them on the menu (sounds gimmicky but actually works — and you can give it to multiple customers if needed)
- Free [item] every visit (only sustainable if Tier 3 is truly your 5%)

Cost target: 5-8% of the customer's annual spend. Tier 3 customers generate the highest absolute dollars, so you can afford to invest more — but as a percentage of their spend, you're still healthy.

The math check. For a coffee shop with $400K revenue, 60% enrollment rate, three tiers:
- 60% in Tier 1 (free perks costing ~$3/year per customer): minimal
- 20% in Tier 2 (10% rewards on their spend): 2% of revenue = $8K
- 5% in Tier 3 (7% rewards): 0.35% of revenue = $1.4K
- Total program cost: ~$10K
- Expected revenue lift from improved retention: 8-12% = $32-$48K
- Net gain: $22-$38K

If your math doesn't pencil out like this, your thresholds or rewards are off. Recalculate before launching.

The three principles of reward selection:

1. Choose rewards that align with how you want customers to behave. If you want customers to bring friends, the reward should be "bring a friend and they get [X]." If you want them to try new products, the reward should be "free new arrival of the month."

2. Choose rewards that have high perceived value and low actual cost. A reserved table for regulars costs you nothing. A complementary appetizer with a $40 entrée costs $3 of food but feels like $12 of value.

3. Choose rewards you can actually deliver consistently. If your "free upgrade" depends on whether the cashier remembers, customers will get inconsistent treatment and complain. Build the reward into the POS or the menu so it's automatic.

The "surprise and delight" upgrade. Every quarter, randomly pick 5 Tier 2 and 2 Tier 3 customers and give them an unexpected reward. A handwritten note, an extra item, an upgrade. Cost: tiny. Word-of-mouth impact: enormous, because customers tell other customers about unexpected surprises.

What never to do:
- Don't make rewards expire on a calendar that customers don't see. Surprise expiration kills trust.
- Don't let rewards stack in confusing ways. One reward per visit.
- Don't allow Tier 2 rewards on top of advertised specials. Set the rule up front.
- Don't change reward values without notice. Communicate every change clearly with 30 days warning.

Tomorrow: enrollment and tracking. The operational mechanics of capturing customers into your program without slowing down service.`,
    },
    {
      day: 4,
      subject: "Enrollment and tracking: the 12-second flow that hooks customers",
      cta: "Pick your tracking method (POS-native, dedicated app, or simple email collection). Set it up today. Train your staff tomorrow.",
      body: `You have a tier structure (Day 2) and a reward menu (Day 3). Now we cover the actual operational mechanics — how customers join, how you track them, and how staff handles it without slowing down the line.

There are three tracking methods. Pick the one that fits your business:

Option A: POS-native loyalty (Square, Toast, Clover, Shopify, etc.)
- Pros: Built in, automatic, easy reporting, no extra app for customer
- Cons: Limited customization, customers must remember their phone or email
- Best for: Anyone using a modern POS — this is the default choice if available

Option B: Dedicated loyalty app (Belly, Stamp Me, Fivestars, Social Perks)
- Pros: More customization, push notifications, marketing tools
- Cons: Monthly cost, customers must download an app, friction at signup
- Best for: Businesses with high repeat-visit potential where the app cost pays off

Option C: Simple email + spreadsheet
- Pros: Free, simple, works without any tech
- Cons: Manual, error-prone, no automation
- Best for: Brand-new businesses testing whether a program will work before investing

The 12-second enrollment flow. This is the script and process for getting customers into the program at the register, without slowing down the line:

Cashier: "Have you signed up for our [Program Name] yet? Free, takes 12 seconds, and you'll get [Tier 1 immediate perk]."

If yes: scan/swipe/look up their account. 5 seconds.

If no: "I can sign you up right now — what's the best email or phone for you?" Type into POS. 7 seconds.

Total time: 12 seconds. Conversion rate when scripted this way: 50-70% of customers say yes.

The three enrollment fields, in order:
1. Phone or email (required — this is your identifier)
2. First name (for personalization in emails)
3. Birthday month and day (for the birthday reward — say "we'll send you a free [thing] on your birthday")

Don't ask for: address, gender, demographic info. Each extra field cuts enrollment rate by 8-12%. Three fields max.

Privacy and consent. At enrollment, the customer is opting in to receive marketing texts/emails from you. Make sure your enrollment screen has clear consent language and a link to your privacy policy. In the US, comply with CAN-SPAM (email) and TCPA (text) — every message must have an unsubscribe option, and you can never text customers who didn't explicitly opt in.

Staff training. Two scripts to drill:

Script 1 — at the register, before payment:
"Quick question — are you in our [Program Name]?"

Script 2 — at the register, after payment:
"You earned [X] toward your next reward. You're [N] visits away from [Tier 2 reward]."

The first script captures new enrollments. The second drives repeat visits by surfacing the customer's progress every single time they pay.

The 5-second status check. Every transaction with an enrolled customer should surface their tier and their progress toward the next reward. POS systems can do this — configure it. Receipt should print it. Customer sees it. Their next decision (come back or not) is influenced by it.

Data hygiene. Every month:
- Pull a list of customers who haven't visited in 60 days
- Send them a "we miss you" email with a one-time return offer (Tier 1 perk activated)
- Pull a list of customers within 1 visit of Tier 2 — send them a nudge email
- Pull a list of Tier 3 customers and personally text them (yes, you the owner) just to say hi

This monthly ritual takes 30 minutes and is where 70% of the program's value comes from. The tiers and rewards are the structure; the personal nudges are the engine.

Reporting metrics to track monthly:

1. Enrollment rate: new enrollments / new unique customers. Target 50%+
2. Activation rate: customers who used the program 2+ times / enrolled customers. Target 70%+
3. Tier distribution: % in each tier (target 60-20-5)
4. Tier 2 graduation rate: % of customers who moved from T1 to T2 in 90 days
5. Tier 3 retention: % of T3 customers who stayed T3 vs. dropped to T2 quarter-over-quarter
6. Program-attributed revenue lift: compare repeat rate of enrolled customers vs. non-enrolled

The single most important metric is #2, activation rate. If customers enroll but never use the program, the program isn't real. Anything below 60% means rewards aren't compelling or visibility is too low.

Tomorrow: the launch. Scripts, calendars, and your first 30 days.`,
    },
    {
      day: 5,
      subject: "Launch day: your scripts, calendar, and first 30 days",
      cta: "Pick your launch date (this Friday or next Monday). Use the launch checklist below. Get 50 enrollments in the first 7 days.",
      body: `This is the capstone. You have the structure (Day 2), rewards (Day 3), and operational mechanics (Day 4). Today we launch.

The launch checklist. Block 2-3 hours this week to handle these in one sitting:

Week-before launch:
[ ] Set up tracking in POS or app
[ ] Train staff with the two scripts from Day 4
[ ] Print Tier 2 and Tier 3 reward menus for staff reference
[ ] Print enrollment flyer for the counter
[ ] Order any physical materials (cards, signs)
[ ] Draft launch announcement email and social posts
[ ] Set up automated emails (welcome, tier-up, birthday)
[ ] Test the enrollment flow yourself — sign up, see if you get the welcome email, see if your tier updates

Launch day:
[ ] Soft launch first day — every visiting customer gets pitched
[ ] Owner works the floor and personally enrolls the first 20 customers
[ ] Post on Instagram with launch announcement
[ ] Send announcement email to existing customer email list

Week 1 of launch:
[ ] Daily check on enrollment count
[ ] Address any staff confusion immediately
[ ] Adjust scripts if conversion is below 40%

Week 2-4:
[ ] Weekly review of metrics (enrollments, activations, tier distribution)
[ ] Send first "we miss you" email to lapsed customers
[ ] Surprise & delight 5 random Tier 2 customers

Day 1 launch goal: 15-25 enrollments.
Week 1 launch goal: 50+ enrollments.
Month 1 launch goal: 200+ enrollments.
Month 3: 500+ enrollments and your first repeat-rate measurement showing improvement.

The launch announcement script (email + social):

Subject: "Introducing [Program Name]. Join free, get [Tier 1 perk] today."

Body:
"Hi [first name],

You know how some places just feel like home? Where they remember your name and your usual? We want to be that place for you.

Today we're launching [Program Name] — a free loyalty program designed to make your visits more rewarding. Here's how it works:

- Join free (literally 12 seconds at the register or sign up here)
- Start with [Tier 1 reward] on your next visit
- Hit [Tier 2 milestone] and unlock [Tier 2 reward]
- Reach our [Tier 3 name] and get [Tier 3 reward]

Plus a free [item] on your birthday. Just because.

Existing customers: we already have you in our records. Click here to claim your tier status (most of you will start at Tier 2 because you've been with us a while).

[Big button: Join free]

Looking forward to seeing you,
— [Owner first name]"

Conversion rate from this email: 8-15% of opens enroll directly. The rest enroll in-store over the following weeks when reminded.

Social launch post:
"New: [Program Name] launches today. Free to join. Real rewards. Birthday treats. Members get first dibs on new [items/specials/arrivals]. Sign up at the counter or [link]. Tier 1 perk waiting for you on your next visit."

Pair with a photo of the actual reward (a coffee with a thank-you note, a styled hair, a new dish, etc.). High-engagement post format.

The 30-day rhythm:

Day 1: Launch.
Day 7: First weekly review. Count enrollments. Coach staff on script if numbers are low.
Day 14: First "we miss you" send to customers who enrolled but haven't returned.
Day 21: Pull first tier distribution report. Should see 90% in Tier 1, a few starting to reach Tier 2.
Day 30: Full month review. Compare repeat visit rate of enrolled vs. non-enrolled customers (a directional read since the sample is small, but worth tracking).

Common launch problems and fixes:

Problem: Enrollment rate below 30%.
Likely cause: Staff is not asking, or asking awkwardly.
Fix: Owner spends a shift on the register, models the script, drills with staff.

Problem: High enrollment but low activation.
Likely cause: Tier 1 reward isn't compelling or customers forget the program.
Fix: Make Tier 1 perk more tangible. Print tier status on receipts. Add reward reminders to receipts.

Problem: Tier 2 reached by too many customers (e.g., 40% instead of 20%).
Likely cause: Threshold is too low.
Fix: Don't change the rule for existing members — they earned it. Adjust threshold going forward.

Problem: No one reaching Tier 3.
Likely cause: Threshold is too high, or program is too new.
Fix: Wait 90 days before adjusting. Real Tier 3 customers emerge over time.

The 90-day milestone. By Day 90 of a properly run program, you should see:
- 200-500 enrolled customers (depending on traffic)
- 25-35% increase in repeat visit rate among enrolled vs. non-enrolled
- 15-25% increase in average order value for Tier 2 and Tier 3 customers (they buy more when they feel valued)
- 10-15% revenue lift attributable to the program

You graduated. The 5-day course is over but the program runs forever.

One last note. Most owners do not have time to design, build, and run a loyalty program manually — Social Perks does it for you. AI configures the tiers, the POS integration is one-click, marketing nudges are automated, and you get a weekly dashboard. If you would rather operate your business than maintain a loyalty program, try us free for 14 days. [link]

Either way, the system above works. Launch this week. Start counting enrollments. Send the announcement email today.`,
    },
  ],
};
