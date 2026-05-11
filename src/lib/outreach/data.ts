export type OutreachChannel =
  | "email"
  | "instagram-dm"
  | "tiktok-dm"
  | "linkedin-dm"
  | "sms"
  | "text";

export type OutreachCategory =
  | "influencer-outreach"
  | "customer-followup"
  | "review-request"
  | "partnership"
  | "cold-pitch"
  | "rebooking";

export interface OutreachFollowUp {
  day: number;
  subject: string;
  body: string;
}

export interface OutreachTemplate {
  slug: string;
  title: string;
  channel: OutreachChannel;
  category: OutreachCategory;
  goal: string;
  context: string;
  variables: string[];
  template: string;
  successRate: string;
  proTips: string[];
  followUps: OutreachFollowUp[];
}

export const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email",
  "instagram-dm": "Instagram DM",
  "tiktok-dm": "TikTok DM",
  "linkedin-dm": "LinkedIn DM",
  sms: "SMS",
  text: "Text Message",
};

export const CATEGORY_LABELS: Record<OutreachCategory, string> = {
  "influencer-outreach": "Influencer Outreach",
  "customer-followup": "Customer Follow-Up",
  "review-request": "Review Requests",
  partnership: "Partnerships",
  "cold-pitch": "Cold Pitch",
  rebooking: "Rebooking & Winback",
};

export const CATEGORY_DESCRIPTIONS: Record<OutreachCategory, string> = {
  "influencer-outreach":
    "Land your first creator collab. DM and email scripts that get replies from micro-influencers without sounding like a brand.",
  "customer-followup":
    "Post-purchase check-ins, thank-you notes, and onboarding messages that turn one-time buyers into regulars.",
  "review-request":
    "Polite, high-converting asks for Google, Yelp, and Apple reviews. In-person, SMS, and email versions.",
  partnership:
    "Cross-promo pitches, co-marketing offers, and community event invitations for nearby businesses.",
  "cold-pitch":
    "First-touch outreach to B2B prospects, journalists, podcasters, and local press.",
  rebooking:
    "Bring back lapsed customers. Winback flows, birthday outreach, and seasonal re-engagement campaigns.",
};

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    slug: "cold-ig-dm-micro-influencer",
    title: "Cold Instagram DM to a Micro-Influencer",
    channel: "instagram-dm",
    category: "influencer-outreach",
    goal: "Get a reply from a 1K–25K follower local creator to discuss a free-product collab.",
    context:
      "Use this as your first touch with a creator you've already followed for a week and engaged with twice. Send Tue–Thu, 10am–2pm local time. Keep it under 4 short sentences — IG DMs above ~60 words get auto-collapsed.",
    variables: [
      "{creatorFirstName}",
      "{recentPostReference}",
      "{businessName}",
      "{neighborhood}",
      "{productOrPerk}",
    ],
    template: `Hey {creatorFirstName} — your post about {recentPostReference} actually made me pause my scroll, which never happens.

I run {businessName} over in {neighborhood} and I'd love to send you {productOrPerk} on the house, no strings. If you happen to post about it, amazing — if not, totally cool, just want it in your hands.

Want to send it? Just need an address or the closest pickup spot that works for you.`,
    successRate: "18-24% reply rate when sent to creators who've engaged with your account first",
    proTips: [
      "Reference a specific post from the last 14 days — not their bio. It proves you're a human, not a bulk-DM bot.",
      "Lead with the gift, not the ask. The word 'free' early in the message changes the entire frame from 'work request' to 'gift'.",
      "Skip the pitch deck and rate sheet on first touch. You're trying to start a conversation, not close a deal.",
      "Don't tag your business handle in the DM — IG sometimes flags branded openers as spam.",
      "If they open but don't reply within 4 days, send a single voice note. Voice notes convert 3-4x higher than text follow-ups for influencer outreach.",
    ],
    followUps: [
      {
        day: 5,
        subject: "Quick bump",
        body: "Hey, no pressure at all — just bumping this in case it got buried. Still happy to send the {productOrPerk} over whenever works. Totally fine to ignore if it's not a fit!",
      },
      {
        day: 14,
        subject: "Last ping, promise",
        body: "Last one from me 🙂 if you're ever curious about {businessName}, the offer stands. Either way, will keep cheering on your stuff.",
      },
    ],
  },
  {
    slug: "influencer-product-sample-pitch",
    title: "Email Pitch with Free Product Sample Offer",
    channel: "email",
    category: "influencer-outreach",
    goal: "Move from a warm IG follow to an email-confirmed mailing address for a free PR package.",
    context:
      "Use this when a creator has replied positively to a DM and you've found their business email (in bio, Linktree, or via a tool like Hunter). This is the bridge from casual DM to logistics.",
    variables: [
      "{creatorFirstName}",
      "{businessName}",
      "{productName}",
      "{productValue}",
      "{shippingDate}",
      "{yourFirstName}",
    ],
    template: `Subject: Sending you a {productName} — need your address

Hey {creatorFirstName},

Thanks for being open to this! Quick logistics so I don't waste your time:

— Sending you our {productName} (retail value about \${productValue})
— No content required, no contract, no deliverable list. Genuinely just want you to try it.
— If you love it and want to share, beautiful. If not, the box is yours to keep.
— Shipping {shippingDate} via priority mail, arrives in 3-5 days.

Could you reply with the best shipping address? Also let me know if there's anything I should know — allergies, preferences, a partner who'd want a duplicate, etc.

Excited to hear what you think.

— {yourFirstName}
{businessName}`,
    successRate: "65-75% conversion to a sent package once they've replied once on IG",
    proTips: [
      "List your terms as bullet points — it signals professionalism and lowers their perceived risk.",
      "Always include a retail value figure. Creators need it for their own bookkeeping if they decide to disclose.",
      "Ship priority mail, not standard. The unboxing happens within a week of the conversation, while you're still top of mind.",
      "Include a handwritten thank-you note in the package. ~40% of creators photograph the note even if they don't post about the product.",
      "Never ask for content in the same email where you ask for an address. Separate the gift from the ask by at least one touchpoint.",
    ],
    followUps: [
      {
        day: 7,
        subject: "Did the box arrive?",
        body: "Just wanted to confirm the {productName} got to you safely. No need to share anything publicly — just curious what you think when you have a chance to try it.",
      },
    ],
  },
  {
    slug: "paid-collab-inquiry-creator",
    title: "Paid Post Inquiry for an Established Creator",
    channel: "email",
    category: "influencer-outreach",
    goal: "Open a paid collaboration conversation with a 10K+ creator who already has a posted rate.",
    context:
      "Use when you're approaching a creator with a media kit or visible 'collab' tier. This email respects their time and pricing — which is what gets a reply when most brands try to negotiate before they've said hello.",
    variables: [
      "{creatorFirstName}",
      "{businessName}",
      "{campaignTimeline}",
      "{budgetRange}",
      "{contentType}",
      "{yourFirstName}",
    ],
    template: `Subject: Paid collab — {businessName} × {creatorFirstName}

Hey {creatorFirstName},

I'm reaching out about a paid partnership, not a free-product ask. Wanted to get the awkward parts out of the way up front:

— Brand: {businessName}
— Timeline: looking to run something in the {campaignTimeline} window
— Budget: \${budgetRange} for the scope below (open to your rate card if it's different)
— Scope I had in mind: {contentType}
— Usage: organic only, no whitelisting or paid amplification

If this is roughly in your ballpark, I'd love to jump on a 15-min call or just trade a few emails to lock in the brief. If the budget's not workable, totally understand — would love a referral to someone in your audience tier if you've got one.

— {yourFirstName}`,
    successRate: "30-40% reply rate when the budget figure is included in the first email",
    proTips: [
      "Always state a budget number in the first email. Creators get hundreds of 'what are your rates' messages — yours stands out by leading with the offer.",
      "Use a budget range, not a single number. It gives you negotiation room without seeming cheap.",
      "Explicitly state usage rights ('organic only', 'no whitelisting'). Most disputes come from creators discovering their content was boosted as a paid ad.",
      "Ask for a referral if the budget doesn't match. Even rejected creators will often introduce you to a friend at the right tier.",
      "Send between Tuesday and Thursday. Monday emails get buried; Friday emails get postponed to next week and forgotten.",
    ],
    followUps: [
      {
        day: 4,
        subject: "Re: Paid collab — {businessName}",
        body: "Hey {creatorFirstName}, just floating this back to the top in case it got lost. Happy to send a more detailed brief if useful, or close the loop if it's not the right fit right now.",
      },
      {
        day: 11,
        subject: "Closing the loop",
        body: "Going to assume the timing isn't right — totally fair. I'll keep you on the shortlist for the next campaign. If anything changes on your end, my inbox is always open.",
      },
    ],
  },
  {
    slug: "tiktok-dm-ugc-creator",
    title: "TikTok DM to a UGC-Style Creator",
    channel: "tiktok-dm",
    category: "influencer-outreach",
    goal: "Recruit a UGC creator to produce raw, ad-style content (not a sponsored post on their feed).",
    context:
      "TikTok DMs auto-truncate fast and creators check them less than IG. Lead with the deliverable, lead with the dollar amount, and skip the brand backstory.",
    variables: [
      "{creatorFirstName}",
      "{productName}",
      "{ratePerVideo}",
      "{numberOfVideos}",
    ],
    template: `Hey {creatorFirstName} — your editing style is exactly what we need.

Looking to pay you \${ratePerVideo} per video for {numberOfVideos} UGC clips of our {productName}. You'd film, we'd use them as paid ads (you don't post them on your account).

Sound interesting? Happy to send a brief and ship the product this week.`,
    successRate: "22-28% reply rate to TikTok DMs that lead with rate and 'UGC only, no posting'",
    proTips: [
      "Distinguish 'UGC' from 'influencer' explicitly. UGC creators want this distinction — they price differently because they're not lending their audience.",
      "Standard UGC rates: $150-$400 per 30s clip for newer creators, $400-$1,200 for established ones. Don't insult with $50 offers.",
      "Ask for a hook + body + CTA structure in the brief. Creators charge more for 'whole video' than for 'a few hook variations' — be specific.",
      "Include usage terms (90 days organic + paid social, no TV, no out-of-home) — this is the biggest source of post-contract disputes.",
      "Never ask UGC creators to 'just post it to their account' as a freebie. It re-categorizes the work and they'll quote influencer rates.",
    ],
    followUps: [
      {
        day: 3,
        subject: "Quick UGC follow-up",
        body: "Hey, bumping this in case it got buried. Still looking to fill {numberOfVideos} slots this month — let me know if you want me to send the brief.",
      },
    ],
  },
  {
    slug: "linkedin-dm-b2b-creator",
    title: "LinkedIn DM to a B2B Creator or Newsletter Operator",
    channel: "linkedin-dm",
    category: "influencer-outreach",
    goal: "Pitch a newsletter sponsorship or LinkedIn-native sponsored post to a B2B thought leader.",
    context:
      "B2B creators on LinkedIn get spammed by SDRs. The fastest way to differentiate is to reference a specific post and price the ask immediately.",
    variables: [
      "{creatorFirstName}",
      "{recentPostTopic}",
      "{businessName}",
      "{audienceFit}",
      "{budgetNumber}",
    ],
    template: `Hi {creatorFirstName},

Your post on {recentPostTopic} matched almost word-for-word what we hear from our customers. Not a coincidence — we serve the same audience.

I run growth at {businessName}. We help {audienceFit}, and I think there's a fit with your newsletter.

Would you be open to a sponsored issue? Working with a \${budgetNumber} budget. Happy to share examples of what's worked for other operators in your space.

— {yourFirstName}`,
    successRate: "12-18% reply rate on LinkedIn DMs that include both audience fit and budget",
    proTips: [
      "LinkedIn's spam filters down-rank messages with the words 'partnership', 'synergy', 'circle back'. Avoid them.",
      "Connect first, send the message 48 hours after they accept. Cold DMs without a connection have 4x lower open rates.",
      "Reference a post from their last 7 days. LinkedIn's algorithm decays fast; older references signal you're working from a stale list.",
      "Skip the calendar link in the first message. Asking for a meeting before establishing fit is the #1 reason LinkedIn outreach gets ignored.",
      "If you don't get a reply in 6 days, like 2-3 of their newer posts before following up. The notification puts you back on their radar.",
    ],
    followUps: [
      {
        day: 6,
        subject: "Bumping this",
        body: "Hey {creatorFirstName}, just floating this in case it slipped past. Would a quick email be easier than DM? I'm at {yourEmail} — or just say 'not now' and I'll get out of the way.",
      },
    ],
  },
  {
    slug: "customer-24hr-checkin",
    title: "24-Hour Post-Purchase Check-In",
    channel: "email",
    category: "customer-followup",
    goal: "Show up before a customer thinks to complain, catch issues early, and prime them for a future review request.",
    context:
      "Send exactly 24 hours after order confirmation (for product) or 24 hours after a service appointment. The window matters — too early feels robotic, too late feels reactive.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{productOrService}",
      "{ownerFirstName}",
    ],
    template: `Subject: How's the {productOrService} treating you, {firstName}?

Hi {firstName},

It's {ownerFirstName} — I own {businessName}. I'm the one who packed your order yesterday (or my husband did, depending on the box).

I'm not asking for a review or trying to sell you anything else. I just wanted to make sure the {productOrService} arrived in good shape and that it's everything you were hoping for.

If something's off — even a small thing — just hit reply. I read every one of these, and I'd rather hear it from you than read it on Google two weeks from now.

If you're happy? Just smile and ignore this email. That's the best response there is.

— {ownerFirstName}`,
    successRate: "8-14% reply rate; reduces 1-2 star reviews by ~60% when used consistently",
    proTips: [
      "Send from the owner's personal-sounding email (jenny@, not orders@). Reply rates double when it comes from a name, not a department.",
      "Never include a review link in this email. Mixing 'check on you' with 'leave a review' destroys trust.",
      "Read every reply personally for the first 90 days. Your saved-reply templates will be better because of it.",
      "Track what comes back. The complaints in week-1 emails are the same complaints in month-12 reviews — but here you can fix them privately.",
      "If you get a glowing reply, save it. It becomes the most natural review-request context: 'You mentioned you loved how soft it was — would you mind sharing that on Google?'",
    ],
    followUps: [],
  },
  {
    slug: "post-purchase-7day-review",
    title: "7-Day Post-Purchase Review Request",
    channel: "email",
    category: "review-request",
    goal: "Convert a happy customer into a public Google or Yelp review while the experience is still vivid.",
    context:
      "Send 7 days after delivery for products, 3 days after appointment for services. Earlier = customer hasn't formed an opinion. Later = the moment has passed.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{productOrService}",
      "{reviewLink}",
      "{ownerFirstName}",
    ],
    template: `Subject: A 30-second favor, {firstName}?

Hi {firstName},

It's been about a week since the {productOrService} got to you. I hope it's already become one of those things you forget you were ever without.

I'm going to ask for something, but I want to be honest about it: a 30-second Google review is the single most helpful thing a small business like ours can get. It's how the next person finds us. It's how we keep the lights on.

If you've got 30 seconds, here's the direct link: {reviewLink}

You don't need to write much. Even one sentence about what surprised you, or what you'd tell a friend, makes a difference.

If something's not right, please reply here first — I'd much rather hear from you and fix it than have you write a review you'd regret.

Thank you for the chance to serve you.

— {ownerFirstName}
{businessName}`,
    successRate: "12-22% review-conversion rate when sent at the 7-day mark with a direct link",
    proTips: [
      "Use a Google direct-review URL with the placeid pre-loaded. Adding even one click between email and review form drops conversion by 40%.",
      "Honesty about the ask outperforms slickness. 'I'm going to ask for something' converts higher than any clever subject line.",
      "Always offer the off-ramp: 'reply here first if something's not right.' This is how you intercept negative reviews before they're public.",
      "Don't offer a discount or perk in exchange — Google explicitly bans this and will remove the review (and sometimes penalize your listing).",
      "If you have a Social Perks account, swap the manual link for an automated perk drop that triggers on verified review.",
    ],
    followUps: [
      {
        day: 14,
        subject: "Last ask, then I'll stop",
        body: "Hey {firstName}, last bump from me on this 🙂 if a Google review isn't your thing, no worries at all. If you'd be willing to share even a one-liner here: {reviewLink} — it genuinely helps. Either way, thanks again for trusting us.",
      },
    ],
  },
  {
    slug: "review-in-person-script",
    title: "In-Person Review Ask (At Checkout or Service End)",
    channel: "text",
    category: "review-request",
    goal: "Give your front-of-house staff a memorized 12-second script that gets review intent at the peak of customer satisfaction.",
    context:
      "Use at checkout for product businesses, at the end of service for stylists/trainers/practitioners. The moment is right when the customer has just said anything positive ('this was great', 'love it', 'thanks').",
    variables: [
      "{customerFirstName}",
      "{businessName}",
      "{phoneOrLink}",
    ],
    template: `Hand them the receipt or wrap up the service. When they say something kind, smile and say:

"Honestly, {customerFirstName}, that means a lot — would you mind doing me a tiny favor? If you have 30 seconds before you leave, would you tap the link I'm about to text you and leave us a quick Google review? Reviews are how new customers find us. No pressure if you're in a rush."

Then immediately send the text: "Hi {customerFirstName}! It's {businessName} — here's that review link: {phoneOrLink} Thank you 🙏"

Hand them their bag/coat/keys while the text sends. Walk them out.`,
    successRate: "35-45% click-through and 22-28% review completion when timed correctly",
    proTips: [
      "The script only works after the customer says something positive. Asking cold ('would you leave a review?') converts at 1/10th the rate.",
      "Send the SMS while they're still standing in front of you. Their phone buzzes, they pull it out, they tap. Friction = lost review.",
      "Train staff to use the customer's first name — first names raise reply intent by ~30%.",
      "Never ask multiple customers in earshot of each other. The first 'no' makes the second customer say no.",
      "Track conversions by employee. Your highest-converting employee is usually who you'd guess; your lowest needs coaching, not blame.",
    ],
    followUps: [],
  },
  {
    slug: "sms-review-request-recent-customer",
    title: "SMS Review Request to a Recent Customer",
    channel: "sms",
    category: "review-request",
    goal: "Get a Google review from a customer 24-72 hours after a great experience using their preferred channel.",
    context:
      "SMS outperforms email for under-35 demographics and service businesses. Send between 11am and 6pm local time, never weekends. Keep it under 160 chars to avoid carrier splits.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{reviewShortLink}",
    ],
    template: `Hi {firstName} — it's {businessName} 👋 Hope you're loving everything. If you've got 30 sec, a Google review would mean the world: {reviewShortLink} Thank you!`,
    successRate: "28-38% click-through; 14-20% review completion within 48 hours",
    proTips: [
      "Use a URL shortener with custom branding (yourname.link/r). Bare Google URLs trigger more carrier-level spam filters than branded ones.",
      "Always identify yourself in the first 3 words. Unknown-sender SMS gets deleted in under 2 seconds.",
      "Never send review SMS to customers who haven't opted in to marketing texts — the TCPA penalty is $500-$1,500 per violation.",
      "Track which template performs better — the one ending with a 🙏 emoji or with a period. Emoji versions convert 8-12% higher for service businesses.",
      "If they don't click within 24 hours, don't follow up by SMS. A second SMS feels invasive; switch channels (email) for the follow-up.",
    ],
    followUps: [],
  },
  {
    slug: "five-star-email-review-ask",
    title: "Email After a 5-Star Order or Repeat Purchase",
    channel: "email",
    category: "review-request",
    goal: "Capture the highest-converting review opportunity: a customer who has already returned or who has clearly enjoyed their first purchase.",
    context:
      "Trigger when (a) a customer places a second order, or (b) a customer's NPS or post-purchase reply rates as positive. These customers convert to reviewers at 3-5x the rate of first-timers.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{numberOfPurchases}",
      "{reviewLink}",
      "{ownerFirstName}",
    ],
    template: `Subject: {firstName}, you've made me brave enough to ask

Hi {firstName},

This is your {numberOfPurchases} order with us, and I'm taking that as permission to ask for something I usually feel awkward about.

Would you be willing to leave us a Google review?

I know that sounds like a small thing, but for a business like ours, a thoughtful review from someone who's bought more than once is genuinely worth more than any ad we could run. Future customers read reviews from repeat buyers and trust them.

Here's the direct link: {reviewLink}

Anything you'd say to a friend works. One sentence is plenty. Two sentences is generous. A whole paragraph is something I'd print out and tape to the wall.

Thank you for trusting us, more than once.

— {ownerFirstName}
{businessName}`,
    successRate: "32-48% review completion rate (3-5x higher than cold review asks)",
    proTips: [
      "The 'permission to ask' framing converts higher than any other for repeat customers. It honors their loyalty rather than treating them like a transaction.",
      "Mention the exact purchase count. 'Your 3rd order' is more powerful than 'your continued loyalty' because it's specific.",
      "Time this email between purchases 2 and 4. Customers at purchase 5+ assume you're not paying attention if you don't reference history.",
      "Forward 5-star reviews to your team's group chat. Public recognition for the staff member named in the review is the cheapest morale boost in retail.",
      "If they leave a review with a photo, write back the same day with a personal thank-you. ~20% of those replies turn into repeat-of-repeat purchases.",
    ],
    followUps: [
      {
        day: 10,
        subject: "Closing the loop on that ask",
        body: "Hey {firstName}, no follow-up pressure — just wanted to thank you again for being a repeat customer regardless of whether a review ever happens. You make this job good. — {ownerFirstName}",
      },
    ],
  },
  {
    slug: "cross-promo-local-business",
    title: "Cross-Promo Pitch to a Similar Local Business",
    channel: "email",
    category: "partnership",
    goal: "Open a co-marketing conversation with a non-competitive but audience-overlapping local business.",
    context:
      "Target businesses 1-3 miles from yours that share your customer profile but don't sell what you sell. Examples: yoga studio + smoothie shop, salon + boutique, bakery + flower shop.",
    variables: [
      "{ownerFirstName}",
      "{theirBusinessName}",
      "{yourBusinessName}",
      "{specificObservation}",
      "{yourFirstName}",
    ],
    template: `Subject: Quick idea — {theirBusinessName} × {yourBusinessName}

Hi {ownerFirstName},

I run {yourBusinessName} a few blocks from you, and I'm pretty sure half my customers come straight from {theirBusinessName} — I see them walk in carrying your bag.

I had a thought: what if we made it official?

The simple version: we leave a stack of your cards (or postcards, or a tiny perk) at our counter, and you do the same with ours. No money changes hands, no contracts, no spreadsheets. Just two neighbors sending business to each other.

The slightly fancier version: we co-host one small event a quarter — your customers, our customers, both spaces.

Either way, I'd love to grab a coffee and talk about it. {specificObservation}, so I figured this was worth bringing up.

Free this week or next?

— {yourFirstName}
{yourBusinessName}`,
    successRate: "40-55% reply rate when the email mentions a specific observation about their store",
    proTips: [
      "Visit their store before sending. The specific observation ('I noticed you just changed your front window') is what separates this from a templated mass email.",
      "Always offer the 'simple version' first. Local owners are time-starved; complex co-marketing scares them off.",
      "Suggest coffee, not a meeting. The framing matters — coffee implies low commitment, meeting implies a deck and an ask.",
      "Pick businesses with similar customer counts, not similar revenue. A small bakery partnering with a much-larger gym creates one-sided traffic flow that erodes the partnership.",
      "Send Tuesday morning. Small-business owners are reactive on Mondays; by Tuesday they're caught up enough to consider new things.",
    ],
    followUps: [
      {
        day: 8,
        subject: "Bumping this up",
        body: "Hi {ownerFirstName}, no rush on this at all — just floating it back up if it got buried. Even just a 15-minute coffee would be great. Otherwise, I'll stop bugging you and just keep recommending {theirBusinessName} the old-fashioned way 😄",
      },
    ],
  },
  {
    slug: "charity-event-invite",
    title: "Charity / Community Event Invitation",
    channel: "email",
    category: "partnership",
    goal: "Invite a complementary local business to co-sponsor or participate in a charity or community event.",
    context:
      "Use 4-6 weeks before the event date. Local businesses overcommit closer in; this gives them planning runway. Include the cause first — businesses say yes to causes faster than they say yes to brands.",
    variables: [
      "{ownerFirstName}",
      "{theirBusinessName}",
      "{eventName}",
      "{causeOrBeneficiary}",
      "{eventDate}",
      "{askLevel}",
      "{yourFirstName}",
    ],
    template: `Subject: {eventName} — would you co-host with us?

Hi {ownerFirstName},

We're putting together {eventName} on {eventDate}, benefiting {causeOrBeneficiary}. I immediately thought of {theirBusinessName} because your audience and ours genuinely show up for this kind of thing.

The ask is small: {askLevel}. We're handling promotion, logistics, the permits, the volunteers — everything. We just want a few neighborhood businesses with us in spirit and on the flyer.

Last year's version had ~200 attendees and raised \$3,400 for {causeOrBeneficiary}. We're aiming higher this time.

Would you be in? Happy to walk you through it over a quick call or just send a one-page brief if that's easier.

— {yourFirstName}`,
    successRate: "55-70% participation rate when the cause is named and the ask is specific",
    proTips: [
      "Name the cause in the subject line, not the brand. Subject lines starting with 'Fundraiser for...' open 35% more than ones starting with '[Brand] x [Brand]'.",
      "Quantify last year's results, even if last year's was you alone at a card table. Specific numbers signal a real event, not a vague idea.",
      "Define the ask in one phrase ('host a table', 'donate 5 raffle items', 'be on the flyer'). Vague asks generate vague responses.",
      "Always offer the 'one-page brief' option. Some owners need to see it written down before they say yes.",
      "Follow up on a Sunday evening — most local owners do their week-planning then.",
    ],
    followUps: [
      {
        day: 7,
        subject: "Quick bump on {eventName}",
        body: "Hi {ownerFirstName}, just bumping in case this got buried. We've got 4 businesses confirmed so far and would love {theirBusinessName} on the flyer. Quick yes/no/maybe is plenty for now.",
      },
    ],
  },
  {
    slug: "cold-pitch-b2b-local",
    title: "B2B Cold Pitch to a Local Business Owner",
    channel: "email",
    category: "cold-pitch",
    goal: "Open a sales conversation with a local business owner without sounding like an SDR.",
    context:
      "Use when you have a service that helps small businesses (marketing, web design, bookkeeping, etc.). The hardest part of B2B cold email to small businesses is sounding like a human; this template is engineered to.",
    variables: [
      "{ownerFirstName}",
      "{theirBusinessName}",
      "{specificObservation}",
      "{problemYouSolve}",
      "{outcomeYouProduce}",
      "{yourFirstName}",
    ],
    template: `Subject: {theirBusinessName} — noticed something

Hi {ownerFirstName},

I want to be upfront: this is a cold email, but I promise it's a thoughtful one. I spent about 20 minutes on {theirBusinessName} this morning before writing.

Here's what jumped out: {specificObservation}.

I help small businesses with {problemYouSolve}, and based on what I saw, I think the path from where you are to {outcomeYouProduce} is shorter than it looks. I'm happy to share the specific 3 things I'd do if I were running your marketing — no pitch, just a written-up suggestion you can use whether or not we ever talk.

Worth a 15-min call to walk through it? Or I can just send the write-up.

— {yourFirstName}`,
    successRate: "8-14% reply rate when the observation is genuinely specific and useful",
    proTips: [
      "The 'I want to be upfront, this is a cold email' line is the single highest-leverage sentence in this template. It earns 2-3 extra seconds of attention.",
      "Spend the 20 minutes. Faking the observation destroys trust on the first reply. The specific observation must be real.",
      "Offer the value upfront ('I'll send the write-up either way'). The reciprocity bias does the rest.",
      "Don't send a calendar link in the cold email. Asking for a meeting before establishing fit caps reply rates at ~3%.",
      "Track replies by industry. Cold B2B emails to local businesses convert wildly differently by industry — restaurants reply 4x more than dental offices, for example.",
    ],
    followUps: [
      {
        day: 4,
        subject: "Re: {theirBusinessName} — noticed something",
        body: "Hi {ownerFirstName}, bumping this up. Even if a call isn't worth your time, I'd genuinely like to send over the write-up. Just say 'send it' and I will.",
      },
      {
        day: 12,
        subject: "Closing the loop",
        body: "{ownerFirstName}, this is the last one from me. If timing's not right, I get it. I'll keep an eye on {theirBusinessName} and check in again in a few months. Either way, you're doing great work.",
      },
    ],
  },
  {
    slug: "press-media-journalist-pitch",
    title: "Media / Journalist Pitch to a Local Reporter",
    channel: "email",
    category: "cold-pitch",
    goal: "Earn local press coverage for your business by giving a journalist a story they actually want to write.",
    context:
      "Use for newsletter writers, local TV producers, local newspaper reporters, and small-market podcast hosts. The currency here is a story, not your brand.",
    variables: [
      "{journalistFirstName}",
      "{publicationName}",
      "{recentArticleTopic}",
      "{angleOrStory}",
      "{yourFirstName}",
      "{businessName}",
    ],
    template: `Subject: Story tip — {angleOrStory}

Hi {journalistFirstName},

Loved your piece on {recentArticleTopic} — the part about [reference specific detail] stuck with me.

I think I have a follow-up story for you.

Quick version: {angleOrStory}. I run {businessName}, and the data/timeline/photo evidence is real and exclusive. I can put you in touch with 2-3 customers who'd be willing to talk on the record.

Happy to send over a one-pager with the facts, or jump on a 10-min call. No pressure if it's not a fit — just thought it matched what {publicationName} has been covering lately.

— {yourFirstName}`,
    successRate: "5-12% reply rate; story pickup rate of 2-5% when angle is specific and exclusive",
    proTips: [
      "Pitch a story, not your business. Journalists ignore press releases but answer story tips. Reframe your launch as a trend, a local issue, or a human-interest piece.",
      "Always offer exclusivity (real or implied). 'Exclusive' is the single most powerful word in a media pitch.",
      "Mention customers willing to talk on the record. Sourcing is a journalist's biggest pain point; offering pre-vetted sources moves you to the top of the pile.",
      "Pitch the journalist whose last 3 articles match your angle. Mismatched pitches train them to ignore you.",
      "Never attach a PDF press kit on first email. Attachments get filtered, and they signal you're sending the same email to 50 journalists.",
    ],
    followUps: [
      {
        day: 3,
        subject: "Re: Story tip — {angleOrStory}",
        body: "Hi {journalistFirstName}, bumping this in case it got buried in your inbox. Happy to give you a 24-hour head start if it's something you'd want to run with. Otherwise, no worries — I'll find a different home for it.",
      },
    ],
  },
  {
    slug: "podcast-host-guest-pitch",
    title: "Podcast Host Pitch for a Guest Slot",
    channel: "email",
    category: "cold-pitch",
    goal: "Land yourself or your team member as a guest on a relevant small-business or local podcast.",
    context:
      "Use when you have a genuine story or expertise to share. Podcast hosts get inundated with bad pitches; this template wins by leading with what the audience gets, not what you want.",
    variables: [
      "{hostFirstName}",
      "{podcastName}",
      "{recentEpisodeTopic}",
      "{guestAngle}",
      "{audienceTakeaway}",
      "{yourFirstName}",
    ],
    template: `Subject: Guest pitch — {guestAngle}

Hi {hostFirstName},

Long-time listener of {podcastName}. Your recent episode on {recentEpisodeTopic} was the best treatment of that subject I've heard.

Wanted to pitch myself (or pass) as a future guest. The angle:

{guestAngle}

What your listeners would walk away with: {audienceTakeaway}.

A few things I bring to the table:
— A specific, story-shaped journey, not a generic 'how I built my business' arc
— Numbers I can share publicly (revenue, customer count, what worked, what didn't)
— A guest-friendly setup (good mic, quiet room, flexible schedule)

If this is a fit, I'd be honored. If not, I'll keep listening either way.

— {yourFirstName}`,
    successRate: "10-18% reply rate; 4-8% booking rate when the angle matches the show's recent arc",
    proTips: [
      "Reference a specific episode within the last 6 weeks. Hosts can tell who's actually listened vs. who's mass-mailing.",
      "Lead with the audience takeaway, not your bio. Hosts book guests who serve their listeners, not guests who want exposure.",
      "Mention your audio setup in the pitch. ~30% of podcast pitches get rejected because the guest sounds tinny on a laptop mic.",
      "Share specific numbers you're willing to disclose. Vague claims ('grew the business') get fewer bookings than specific ones ('went from $40K to $400K in 18 months').",
      "Don't pitch for self-promotion. Pitch for utility to the audience. The promotion happens naturally during the episode.",
    ],
    followUps: [
      {
        day: 10,
        subject: "Re: Guest pitch",
        body: "Hi {hostFirstName}, no pressure — just floating this back up. Happy to send a one-pager with the full angle if useful. Either way, will keep the headphones on for {podcastName}.",
      },
    ],
  },
  {
    slug: "winback-30-day-inactive",
    title: "30-Day Inactive Customer Winback",
    channel: "email",
    category: "rebooking",
    goal: "Bring back a customer who hasn't purchased or booked in 30 days, without sounding desperate or discount-driven.",
    context:
      "Send exactly 30 days after last order/appointment. Earlier feels needy; later (60+ days) requires a stronger offer to convert.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{lastPurchaseOrVisit}",
      "{ownerFirstName}",
      "{perkOrOffer}",
    ],
    template: `Subject: We miss having you in, {firstName}

Hi {firstName},

It's been about a month since {lastPurchaseOrVisit}, and I just wanted to check in. No data point on my end said 'send this email' — I noticed because I noticed.

If life got busy or something about your last visit wasn't right, I'd love to hear about it. Just hit reply.

If you want to come back, here's a small thank-you for being a customer: {perkOrOffer}. No expiration, no fine print. Just here when you're ready.

— {ownerFirstName}
{businessName}`,
    successRate: "10-16% winback rate within 14 days; double for service businesses vs product",
    proTips: [
      "The 'I noticed because I noticed' line outperforms automated framings. Even if it's automated, the language matters.",
      "Never use an expiring discount on a 30-day winback. Pressure tactics work for never-bought-from-us prospects, not lapsed regulars — they read as insulting.",
      "Reference their last purchase or visit by detail, not just date. 'Since you came in for the trim' beats 'since your last visit'.",
      "Offer a perk, not a discount. 'Free add-on next visit' converts higher than '15% off' because it implies a future moment, not a transaction.",
      "Track who replies vs. who silently returns. Both are wins, and the silent returns are usually 2-3x larger than the reply-then-buy group.",
    ],
    followUps: [
      {
        day: 14,
        subject: "Still saving your spot",
        body: "Hi {firstName}, just a soft reminder that the {perkOrOffer} is still here whenever you'd like it. No reply needed — just wanted to make sure it didn't expire from your inbox.",
      },
    ],
  },
  {
    slug: "birthday-outreach",
    title: "Customer Birthday Outreach",
    channel: "email",
    category: "rebooking",
    goal: "Use a customer's birthday as a natural, non-pushy reason to give them something and pull them back in.",
    context:
      "Send 5-7 days before the birthday, not on it. The 'plan a thing' window is more useful than the 'celebrate today' window.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{ownerFirstName}",
      "{birthdayPerk}",
    ],
    template: `Subject: Your birthday is coming up, {firstName}

Hi {firstName},

Quick birthday note from {businessName} — your birthday is in about a week, and I wanted to send this early so you actually have time to use it.

Here's your gift: {birthdayPerk}. Good for the whole month around your birthday, no questions, no fine print. Bring a friend if you want. Bring three.

I know inbox-birthday messages can feel automated, so I'll keep this short. Just glad you're in our customer family.

Happy early birthday.

— {ownerFirstName}`,
    successRate: "20-35% redemption rate; 2-4x average order size on birthday redemptions",
    proTips: [
      "Always send 5-7 days before, never on the day. Day-of birthday emails are buried under family, friend, and bank texts.",
      "Make the perk valid for ~30 days around the birthday, not just one day. Single-day perks get forgotten; month-long perks get used.",
      "'Bring a friend' converts birthday perks into multi-customer trips. ~40% of birthday redemptions arrive with at least one new face.",
      "Don't ask for the birthday at signup as a required field — make it optional with a 'get a birthday gift' incentive. Conversion on the optional version is higher than on the required version.",
      "If you have Social Perks, auto-trigger the perk drop one week before each customer's birthday. Manual management of birthday calendars is the #1 reason small businesses drop this play.",
    ],
    followUps: [
      {
        day: 7,
        subject: "Hope your birthday's been a good one",
        body: "Hi {firstName} — hope your week's been a good one! Just a quick reminder your birthday perk is still active for the next few weeks. Use it whenever feels right.",
      },
    ],
  },
  {
    slug: "seasonal-reengagement",
    title: "Seasonal Re-Engagement (Holiday / Summer / New Year)",
    channel: "email",
    category: "rebooking",
    goal: "Use a seasonal moment as natural cover to re-engage your dormant list without it feeling like a campaign.",
    context:
      "Send 10-14 days before the seasonal moment (Mother's Day, summer, back-to-school, holidays). Don't tie the email to a specific deadline if you can help it — let the season be the reason.",
    variables: [
      "{firstName}",
      "{seasonOrHoliday}",
      "{businessName}",
      "{seasonalOfferOrIdea}",
      "{ownerFirstName}",
    ],
    template: `Subject: {seasonOrHoliday} is coming up — thought of you

Hi {firstName},

{seasonOrHoliday} is a couple of weeks out, and I had a half-thought about you specifically.

Most years I keep this list pretty quiet, but {seasonalOfferOrIdea} feels worth flagging early. If it's not your thing, totally fine — delete and we'll catch each other another time.

If it is your thing, just reply or come in. I'll set it aside or get you on the schedule.

Hope the season is being kind to you.

— {ownerFirstName}
{businessName}`,
    successRate: "8-14% click-through; 4-8% conversion on seasonal sends to a 90-day dormant list",
    proTips: [
      "Send seasonal re-engagement emails 10-14 days out, not the day of. The 'plan now' window is more valuable than the 'buy now' window.",
      "Keep your list quiet between sends. Businesses that email their list weekly have lower seasonal performance than businesses that email monthly — quiet lists pay attention.",
      "Avoid the word 'sale' in subject lines. 'Sale' triggers spam filters and signals 'mass email' rather than 'thought of you'.",
      "Send from your owner email, not a no-reply. Reply-friendly seasonal emails convert 30-50% higher than broadcast-style ones.",
      "Segment by past seasonal behavior. Customers who bought last Mother's Day are 4-6x more likely to buy this Mother's Day than your full list.",
    ],
    followUps: [],
  },
  {
    slug: "first-time-customer-thank-you",
    title: "First-Time Customer Thank-You Note",
    channel: "email",
    category: "customer-followup",
    goal: "Convert a first-time buyer into a second-time buyer by making them feel disproportionately seen.",
    context:
      "Send within 4 hours of their first order or appointment. The window matters — the dopamine of buying is still active, and a thank-you note multiplies the experience.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{ownerFirstName}",
      "{productOrService}",
    ],
    template: `Subject: Your first order from us, {firstName}

Hi {firstName},

I just saw your name come through as a first-time customer at {businessName}, and I wanted to write personally.

Most of our business is repeat — so when someone new comes in, I notice. Welcome.

A few things I'd want a new customer to know:
— If anything's off with the {productOrService}, just reply here. I read every email.
— You're not on a marketing list. I send maybe one note a month, max.
— If you ever want a recommendation for something in our store/menu, just ask. I'll give you the honest answer, not the upsell.

Thanks for trusting us once. I hope we earn the second time.

— {ownerFirstName}`,
    successRate: "60-75% positive reply rate; ~25% lift in second-purchase rate vs no thank-you",
    proTips: [
      "Send within 4 hours, not 24. The dopamine of a first purchase fades fast; the note compounds it when it lands during the afterglow.",
      "'I noticed' is the operative phrase. Even at scale, the customer needs to feel like an exception, not an entry in a database.",
      "Promise low email frequency in the note. Trust is built by under-delivering on email volume and over-delivering on service.",
      "Never include a discount code in the first thank-you. Mixing 'welcome' with 'spend more' poisons the warmth.",
      "Save the email and reuse the structure, but personalize 2-3 lines for each customer in the first 6 months. After that, automation is fine — but only after you understand the responses by hand.",
    ],
    followUps: [],
  },
  {
    slug: "abandoned-cart-personal",
    title: "Personal Abandoned-Cart Recovery (Not Automated-Looking)",
    channel: "email",
    category: "customer-followup",
    goal: "Recover an abandoned cart with an email that doesn't feel like an automated abandoned-cart email.",
    context:
      "Send 4-6 hours after abandonment, not immediately. Too soon feels like surveillance; too late and they've moved on. Avoid all the standard 'You left something behind!' phrasing.",
    variables: [
      "{firstName}",
      "{productName}",
      "{businessName}",
      "{ownerFirstName}",
    ],
    template: `Subject: Quick question, {firstName}

Hi {firstName},

I noticed you were checking out the {productName} earlier and didn't end up finishing the order. I'm not writing to push you to buy — I'm writing because if there was something confusing or something stopped you, I'd actually love to know.

Was it the price? Sizing? Shipping? Something else? Just hit reply with one word and I'll help.

If you got distracted and just want to pick up where you left off, here's the cart still saved: [link]

Either way — thanks for stopping by.

— {ownerFirstName}
{businessName}`,
    successRate: "12-22% recovery rate vs 5-8% for standard 'You left items behind!' emails",
    proTips: [
      "Never use the phrase 'you left items in your cart'. It triggers ad-blocker-trained antibodies and instantly identifies the email as automated.",
      "Asking 'what stopped you' converts better than offering a discount. ~30% of abandoners had a simple question — they just don't have a way to ask.",
      "Reading the replies for the first 60 days will surface 3-5 site issues you didn't know existed. Fix them, and your overall cart-completion rate rises 5-15%.",
      "Don't send abandoned-cart emails to existing repeat customers. They feel surveilled; their conversion rate is already higher than first-time abandoners.",
      "Time the send to 4-6 hours after abandonment. Earlier than 2 hours and you spook them; later than 12 and you're competing with sleep.",
    ],
    followUps: [
      {
        day: 2,
        subject: "Saved your spot",
        body: "Hi {firstName}, the {productName} is still in your cart and inventory's still good. No follow-up after this — just wanted to make sure the cart didn't disappear on you.",
      },
    ],
  },
  {
    slug: "referral-program-launch",
    title: "Referral Program Launch to Existing Customers",
    channel: "email",
    category: "customer-followup",
    goal: "Launch a referral program to your best customers in a way that feels exclusive rather than promotional.",
    context:
      "Send only to customers who've made 2+ purchases or have left a positive review. Mass referral-program emails to cold lists have ~1/10th the conversion of targeted ones.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{referrerPerk}",
      "{friendPerk}",
      "{referralLink}",
      "{ownerFirstName}",
    ],
    template: `Subject: A small program just for our best customers, {firstName}

Hi {firstName},

I built something small that I'm only sending to customers I know personally, which is why you're getting it.

It's a referral program. The mechanics:
— You send your unique link ({referralLink}) to a friend
— They use it on their first order — they get {friendPerk}
— You get {referrerPerk}, no minimums, no expiration

That's it. No leaderboards, no points, no app. I wanted something that felt like recommending a coffee shop to a friend, not joining a multi-level marketing scheme.

If you've already been recommending us — and I know some of you have — this just lets me thank you properly. If you haven't, no pressure to start. The link's there if you ever want it.

Thanks for being someone I'd build a program around.

— {ownerFirstName}`,
    successRate: "15-25% activation rate; 3-7% of activated referrers drive 60%+ of program revenue",
    proTips: [
      "Only send to customers with 2+ purchases or visible loyalty signals. Untargeted referral launches train your best customers to ignore future ones.",
      "Make the friend perk slightly more generous than the referrer perk. Referrers want to give a great gift, not extract a small reward.",
      "Avoid points systems and leaderboards for service/local businesses. They convert worse than simple-perk programs because they feel transactional.",
      "Track which customers refer multiple times — those are your power referrers. ~5% of referrers drive 60%+ of program volume.",
      "Re-engage your top 10 referrers personally every quarter. A handwritten thank-you to your top referrers is the single highest-ROI marketing spend you can make.",
    ],
    followUps: [
      {
        day: 21,
        subject: "Quick update on the referral thing",
        body: "Hi {firstName}, no obligation at all — just a quick note that the referral link is still there if you ever want to send it. We've already had a handful of new customers come in this way. Thanks for being part of it.",
      },
    ],
  },
  {
    slug: "no-show-followup",
    title: "No-Show Follow-Up (Appointment Missed)",
    channel: "sms",
    category: "rebooking",
    goal: "Re-engage a customer who missed an appointment without shaming them or charging fees.",
    context:
      "Send within 2 hours of the missed appointment. Later, and they assume they're banned. The shorter the gap, the higher the rebook rate.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{reschedLink}",
    ],
    template: `Hey {firstName} — it's {businessName}. No worries about today's appointment, life happens 💛 Whenever you're ready to reschedule, here's the link: {reschedLink}`,
    successRate: "35-50% rebook rate within 7 days; <10% with no follow-up",
    proTips: [
      "Lead with 'no worries'. Most no-shows are stressed about contacting you — the relief in your message is the conversion lever.",
      "Skip the no-show fee on the first miss for any returning customer. The lifetime-value math favors forgiveness; the rebook revenue exceeds the fee.",
      "Use a heart emoji (or similar warm signal) — text-only messages from businesses after a no-show read as cold and confrontational.",
      "Send the rebook link, not a 'call us to rebook' instruction. Friction = lost customer; one-tap rebooking = recovered revenue.",
      "Track your no-show rate by appointment time. If you have a 25%+ no-show rate at a specific slot, the slot is the problem, not the customers.",
    ],
    followUps: [
      {
        day: 5,
        subject: "Still saving you a spot",
        body: "Hi {firstName}, still happy to get you back on the schedule whenever works. Just reply with a day that's good and I'll find you a slot 🙂",
      },
    ],
  },
  {
    slug: "vip-customer-personal-text",
    title: "VIP Customer Personal Text Message",
    channel: "text",
    category: "customer-followup",
    goal: "Send a high-value customer a personal text that makes them feel like a friend of the business, not a CRM entry.",
    context:
      "Reserve for your top 10-20 customers (top 10% by spend or top 10% by referrals). Send 3-4 times a year, never on a scheduled cadence. The whole point is that it doesn't feel scheduled.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{specificContext}",
      "{ownerFirstName}",
    ],
    template: `Hey {firstName} — it's {ownerFirstName} from {businessName}. {specificContext}. Wanted to say thanks for being one of our favorite regulars. No reply needed, just on my mind today. 🙏`,
    successRate: "60-80% reply rate; significant uptick in repeat purchase frequency for 60 days post-send",
    proTips: [
      "Send from your personal phone, never a business shortcode. The whole effect is that it's not a marketing message.",
      "Reference something specific to that customer ('the dog you brought in', 'the trip you mentioned'). Specifics are what separate this from a templated 'thank you'.",
      "Say 'no reply needed'. ~70% of customers reply anyway, but giving them an out increases the warmth of the ones who do reply.",
      "Cap your VIP list at 20 names. The cost of personalizing for 20 is sustainable; the cost for 100 turns it into another marketing channel that loses its effect.",
      "Never include a link or offer. The whole power of this is that it asks for nothing.",
    ],
    followUps: [],
  },
  {
    slug: "negative-review-response",
    title: "Public Response to a Negative Review",
    channel: "email",
    category: "customer-followup",
    goal: "Reply to a 1-3 star public review in a way that protects future customers' impression of you and opens a private resolution path.",
    context:
      "Respond within 24 hours, never within the first 60 minutes (you'll write defensively). Address the reviewer publicly, then move to private. Future customers read your reviews to learn about you — they're the actual audience here.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{specificComplaint}",
      "{ownerFirstName}",
      "{contactInfo}",
    ],
    template: `Posted publicly under the review:

Hi {firstName} — this is {ownerFirstName}, owner of {businessName}. Thank you for taking the time to share this. I'm sorry your experience didn't live up to what we hope to offer.

You mentioned {specificComplaint} — that's not the experience I want anyone to have, and I want to make it right. I've sent you a direct message and a follow-up email at the address on your account, but the fastest way to reach me is directly: {contactInfo}.

Whether or not we connect, your feedback already changed something on our end — we've [specific change made]. Thank you for that.

— {ownerFirstName}, owner`,
    successRate: "30-45% of reviewers update their review after a sincere public + private response",
    proTips: [
      "Always reply publicly first, even if your goal is private resolution. Future customers reading reviews see the reply, not the resolution.",
      "Acknowledge the specific complaint by name. Generic 'sorry you had a bad experience' replies signal a copy-paste and erode trust.",
      "Name a specific change you've already made. It transforms the review from a complaint into a contribution.",
      "Never apologize for things that aren't your fault. Apologize for the outcome ('not the experience we hope to offer'), not the cause.",
      "Sign with your name and title ('— Sarah, owner'). Owner-signed responses humanize the business and convert 2-3x more reviewers to revisit.",
    ],
    followUps: [
      {
        day: 14,
        subject: "Following up on your review",
        body: "Hi {firstName}, hope you got my earlier message. Still happy to make this right whenever works. No pressure — wanted to make sure you knew the door's open.",
      },
    ],
  },
  {
    slug: "post-event-attendee-followup",
    title: "Post-Event Attendee Follow-Up",
    channel: "email",
    category: "customer-followup",
    goal: "Convert an event attendee or workshop participant into a paying customer or returning visitor.",
    context:
      "Send 18-24 hours after the event, not the next morning. Same-day emails compete with attendees' end-of-day fatigue; same-week emails feel disconnected.",
    variables: [
      "{firstName}",
      "{eventName}",
      "{businessName}",
      "{specificEventMoment}",
      "{nextStep}",
      "{ownerFirstName}",
    ],
    template: `Subject: That was a good night, {firstName}

Hi {firstName},

Thank you for being at {eventName} last night. The crowd was the kind where I left more energized than when I started, which is rare.

A specific shout-out: {specificEventMoment}. It mattered.

Two things on the practical side:
— The photos and notes from the event are here: [link]
— If you'd like to {nextStep}, the easiest path is to reply to this email and I'll set it up directly.

And if you just enjoyed the night and have no interest in next steps, totally fine. We're glad you came.

— {ownerFirstName}
{businessName}`,
    successRate: "20-35% next-step conversion when the email references a specific event moment",
    proTips: [
      "Reference a specific event moment by name. Generic 'thanks for coming' emails convert 1/3 as well as ones that name a real moment.",
      "Send 18-24 hours after the event. Same-night emails get lost in 'I'm tired'; two-day-out emails feel disconnected from the moment.",
      "Always include the photos or recap link, even if just 1-2 images. ~40% of attendees click for the photos, which extends the engagement window.",
      "Include a clear next step, but offer the 'no next step is also fine' off-ramp. Pressure converts worse than permission.",
      "Track who shows up to your next event from this list. Repeat attendees convert to customers at 5-10x the rate of one-time attendees.",
    ],
    followUps: [],
  },
  {
    slug: "appointment-confirmation-text",
    title: "Pre-Appointment Confirmation Text",
    channel: "sms",
    category: "customer-followup",
    goal: "Reduce no-shows by sending a warm, branded confirmation that doesn't feel like a robotic reminder.",
    context:
      "Send 24 hours before the appointment, then 2 hours before. Two-touch sequences cut no-show rates by ~40% compared to single reminders.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{appointmentTime}",
      "{rescheduleLink}",
    ],
    template: `Hi {firstName}! 👋 Just a friendly reminder — you're booked with {businessName} tomorrow at {appointmentTime}. We're looking forward to seeing you. Need to reschedule? No problem: {rescheduleLink}`,
    successRate: "Reduces no-show rate from 12-18% baseline to 4-7% when paired with a 2-hour reminder",
    proTips: [
      "Always pair a 24-hour reminder with a 2-hour reminder. Single reminders cut no-shows by ~20%; dual reminders cut by ~50%.",
      "Include the reschedule link, not just a phone number. The 'should I just cancel?' moment happens at 11pm; you need a self-serve option.",
      "Start with the customer's first name and an emoji. Robotic-feeling reminders are easier to ignore than warm ones — but don't overdo emoji density.",
      "Skip the 'reply YES to confirm' instruction. Forcing confirmation creates a new way for customers to feel guilty about missing — and increases ghosted cancellations.",
      "Track no-show rates by appointment time, day of week, and customer segment. The 25% no-show problem is almost always concentrated in one segment.",
    ],
    followUps: [
      {
        day: 0,
        subject: "2-hour reminder",
        body: "Hey {firstName} — just a heads-up your appointment with {businessName} is in 2 hours at {appointmentTime}. See you soon! 🙂",
      },
    ],
  },
  {
    slug: "thank-you-after-referral",
    title: "Thank-You Email After a Customer Refers Someone",
    channel: "email",
    category: "customer-followup",
    goal: "Reinforce a referral behavior immediately so the referrer keeps referring.",
    context:
      "Send within 24 hours of the referred customer's first purchase or appointment. Speed signals 'you matter' more than perk size.",
    variables: [
      "{firstName}",
      "{referredFriendFirstName}",
      "{businessName}",
      "{thankYouPerk}",
      "{ownerFirstName}",
    ],
    template: `Subject: You sent {referredFriendFirstName} our way — thank you

Hi {firstName},

{referredFriendFirstName} just made their first order/appointment with us today, and they mentioned you sent them.

I just wanted to say thank you, personally. Referrals from existing customers are the single most generous thing a small business can receive — you're vouching for us with your social capital, which is harder to earn than a paid ad ever could be.

I've added {thankYouPerk} to your account. It's automatic, no code, just there next time you're in.

If there are ever other friends or family I should know to take extra-good care of, just send their name and I'll watch for them.

Thank you. Really.

— {ownerFirstName}
{businessName}`,
    successRate: "Referrers who get a thank-you within 24 hours refer 4-6x more often over 12 months",
    proTips: [
      "Send within 24 hours. The delay between referral and thank-you is the strongest predictor of whether the referrer ever refers again.",
      "Name the referred friend explicitly. Generic 'thanks for referring' messages convert 1/3 as well as ones that name the actual referral.",
      "Auto-credit the perk; never ask the customer to redeem it. Friction at the thank-you step poisons the goodwill.",
      "Mention 'if there are others I should watch for' — it invites the second referral without demanding it. ~25% of customers reply with another name.",
      "If a customer refers 3+ people, escalate to a handwritten thank-you. Top referrers are your most undervalued marketing channel; don't lose them to silence.",
    ],
    followUps: [],
  },
  {
    slug: "lapsed-vip-handwritten-style",
    title: "Lapsed VIP Customer — Handwritten Note Style",
    channel: "email",
    category: "rebooking",
    goal: "Win back a high-value customer who hasn't been in for 90+ days using a tone that mimics a physical handwritten note.",
    context:
      "Reserve for customers in your top 20% by spend who've been dormant for 90+ days. The tone here matters as much as the message — read it out loud before sending.",
    variables: [
      "{firstName}",
      "{businessName}",
      "{specificMemory}",
      "{ownerFirstName}",
    ],
    template: `Subject: Just thinking of you

{firstName},

This is one of those emails I almost didn't send because I wasn't sure if it would feel weird. I'm going to send it anyway.

I haven't seen you in {businessName} in a few months. There's no algorithm that flagged this — I just remembered {specificMemory} the other day and realized I missed seeing you.

I'm not going to attach a discount or a perk to this. That would cheapen the actual reason I'm writing, which is that you were one of those customers who made the work feel like more than work.

If you want to come back, my door is open and I'd genuinely love to catch up. If life has taken you somewhere else, I'll be happy for you anyway.

Either way — thank you for the time you spent with us.

— {ownerFirstName}`,
    successRate: "25-40% reply rate; 15-25% return-visit rate within 60 days",
    proTips: [
      "Read this out loud before sending. The tone is fragile — any business-speak ('valued customer', 'don't miss out') ruins it.",
      "Never include a perk or discount in this email. The whole power is that it isn't transactional. Send the perk separately if at all.",
      "The specific memory must be real. Even one fabricated detail destroys the message entirely. If you can't remember anything specific, send a different template.",
      "Send from your personal-sounding email, ideally hand-typed. Auto-mailer DKIM headers can break the spell even if the message reads well.",
      "Limit this to ~20 sends per quarter. It scales badly because the energy required to write each one is high — but the ROI per send is wildly outsized.",
    ],
    followUps: [],
  },
  {
    slug: "new-product-launch-existing-customers",
    title: "New Product Launch to Existing Customer List",
    channel: "email",
    category: "customer-followup",
    goal: "Announce a new product or service to existing customers in a way that feels like an inside tip, not a marketing blast.",
    context:
      "Send to existing customers ~48 hours before any public launch. The exclusivity window is the actual product here.",
    variables: [
      "{firstName}",
      "{newProductName}",
      "{businessName}",
      "{whyMadeIt}",
      "{ownerFirstName}",
    ],
    template: `Subject: First look — only sending to customers

Hi {firstName},

We're launching {newProductName} on Friday. Public emails go out then.

But before anything goes public, I wanted to give existing customers a 48-hour head start. Here's why:

{whyMadeIt}

That's the entire backstory. No countdown timer, no 'limited spots', no bundle pricing tricks. Just a head start for the people who already trust us.

You can see it / order it / book it here: [link]

If it's not for you, no problem. Public launch is Friday and you can always come back.

— {ownerFirstName}
{businessName}`,
    successRate: "12-20% conversion among existing customers during the 48-hour preview window",
    proTips: [
      "Send to existing customers 48 hours before any public marketing. The exclusivity itself converts harder than any discount.",
      "Tell the actual backstory. Why you made it. What problem it solves for you. Customers buy stories from small businesses; specifications from big ones.",
      "Avoid fake scarcity ('only 50 spots') unless it's actually true. Existing customers smell fake scarcity instantly and unsubscribe from your trust capital.",
      "Track exclusivity-window conversions separately from public-launch conversions. Existing-customer launch revenue is almost always 2-4x higher than public launch revenue per email.",
      "Use the email subject line 'First look' or 'Customers first' — these outperform 'Introducing' / 'Now available' by ~40% for small-business launches.",
    ],
    followUps: [],
  },
  {
    slug: "wholesale-buyer-cold-pitch",
    title: "Cold Wholesale Buyer Pitch (Boutique Owners, Stockists)",
    channel: "email",
    category: "cold-pitch",
    goal: "Get a boutique or specialty retailer to consider carrying your product line.",
    context:
      "Use when you have a wholesale-ready product and you're approaching boutique owners or buyers. The email needs to do the work of a sales rep, which means it leads with margins and ends with a sample, not a deck.",
    variables: [
      "{buyerFirstName}",
      "{storeNameOrBoutique}",
      "{yourProductName}",
      "{wholesalePrice}",
      "{srpRange}",
      "{yourBusinessName}",
      "{yourFirstName}",
    ],
    template: `Subject: Sample for {storeNameOrBoutique}?

Hi {buyerFirstName},

I'm reaching out about {yourProductName} — I think it could be a strong fit for {storeNameOrBoutique}'s customer.

The relevant numbers:
— Wholesale: \${wholesalePrice} per unit, MOQ 12 units
— SRP: \${srpRange} (50-55% margin for you)
— Lead time: 5-7 business days, no minimums after the first order
— Sell-through at similar boutiques: 70-85% within 60 days

I'd love to send you 2-3 samples (no charge, no commitment) so you can see and feel them in person before any conversation about a line sheet.

If that's of interest, just reply with the best address and I'll have them out tomorrow.

— {yourFirstName}
{yourBusinessName}`,
    successRate: "10-15% reply rate; 60-70% sample-to-line-sheet conversion when product fits",
    proTips: [
      "Lead with the wholesale price and SRP range. Buyers scan the margins first; everything else is a tiebreaker.",
      "Offer 2-3 free samples on first email, not a line sheet. Line sheets get filed; samples get displayed.",
      "Include sell-through data from comparable boutiques if you have it. If you don't, omit the line — fake numbers kill trust faster than no numbers.",
      "Mention MOQ explicitly. Buyers want to know before they ask; omitting it signals an inflexible vendor.",
      "Send between 10am and noon local time on Tuesday or Wednesday. Boutique owners batch wholesale review on slow weekdays.",
    ],
    followUps: [
      {
        day: 5,
        subject: "Re: Sample for {storeNameOrBoutique}?",
        body: "Hi {buyerFirstName}, just bumping this back up. Happy to send samples even if you're not sure yet — they're yours either way. Just need an address.",
      },
      {
        day: 18,
        subject: "Closing the loop",
        body: "Hey {buyerFirstName}, this'll be the last note from me. If timing's not right, I get it. I'll keep an eye on {storeNameOrBoutique}'s new arrivals and reach back in the spring if our line evolves in a relevant direction. Either way — wishing you a strong season.",
      },
    ],
  },
];

export const OUTREACH_BY_CATEGORY: Record<OutreachCategory, OutreachTemplate[]> =
  OUTREACH_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<OutreachCategory, OutreachTemplate[]>);

export const OUTREACH_BY_CHANNEL: Record<OutreachChannel, OutreachTemplate[]> =
  OUTREACH_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.channel]) acc[template.channel] = [];
    acc[template.channel].push(template);
    return acc;
  }, {} as Record<OutreachChannel, OutreachTemplate[]>);

export const OUTREACH_CATEGORIES: OutreachCategory[] = [
  "influencer-outreach",
  "customer-followup",
  "review-request",
  "partnership",
  "cold-pitch",
  "rebooking",
];

export function getOutreachTemplate(slug: string): OutreachTemplate | undefined {
  return OUTREACH_TEMPLATES.find((t) => t.slug === slug);
}
