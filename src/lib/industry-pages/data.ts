// Industry-specific marketing landing page data
// 20 conversion-focused landing pages targeting "[industry] marketing software" searches

export interface IndustryFeature {
  title: string;
  description: string;
}

export interface CampaignIdea {
  name: string;
  perk: string;
  action: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  business: string;
  location: string;
  result: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface IndustryPage {
  slug: string;
  industry: string;
  industryShort: string;
  metaTitle: string;
  metaDescription: string;
  heroPain: string;
  heroSubhead: string;
  builtForSection: {
    intro: string;
    features: IndustryFeature[];
  };
  campaigns: CampaignIdea[];
  differentiator: {
    intro: string;
    points: { title: string; body: string }[];
  };
  testimonials: Testimonial[];
  faqs: FAQ[];
}

const baseFAQs = (industry: string, short: string): FAQ[] => [
  {
    question: `How is Social Perks different from generic marketing software for ${short}?`,
    answer: `Most marketing tools are built for ecommerce or SaaS. Social Perks is built for local ${short.toLowerCase()} businesses. Every template, perk, and AI suggestion is tuned for ${industry.toLowerCase()} customers — the people, behaviors, and platforms that actually drive walk-ins, bookings, and reorders.`,
  },
  {
    question: `Do I need to be tech-savvy to run campaigns for my ${short.toLowerCase()}?`,
    answer: `No. If you can send a text message, you can launch a Social Perks campaign. Pick a template, choose a perk (free coffee, $10 off, a free upgrade), and we generate the QR code, signage, and customer flow. Most ${short.toLowerCase()} owners are live in under 15 minutes.`,
  },
  {
    question: `How do customers actually post about my ${short.toLowerCase()}?`,
    answer: `They scan a QR code at your counter or follow a link from a receipt. They pick an action (post a photo, leave a Google review, tag a friend, share a story), complete it, and our system verifies it through platform APIs. Then they get their perk instantly — no manual checking.`,
  },
  {
    question: `What kinds of perks work best for a ${short.toLowerCase()}?`,
    answer: `Small, instantly-redeemable perks beat large ones every time. A free drink, a $5 discount, an upgrade, or a free add-on converts at 3-5x the rate of a "10% off your next visit" offer. Our AI suggests perk values based on your industry, location, and average ticket size.`,
  },
  {
    question: `Will this actually bring new customers in, or just reward existing ones?`,
    answer: `Both — and the math works either way. A new customer acquired through a friend's Instagram post costs you ~$3 in perk value vs. $20-40 through paid ads. An existing customer who posts brings in 2.4 new visitors on average. Your existing fans are your cheapest acquisition channel.`,
  },
  {
    question: `Is this compliant with FTC disclosure rules?`,
    answer: `Yes. Every post generated through Social Perks is auto-tagged with the required FTC #ad or #partner disclosure for the platform. We handle compliance so you don't have to think about it. This is built in and cannot be disabled.`,
  },
  {
    question: `What if a customer posts something negative or off-brand?`,
    answer: `Our AI review pipeline flags off-brand, inappropriate, or low-quality content before it counts toward a perk. You set your brand standards once (family-friendly, no competitor mentions, on-message), and the system enforces them automatically.`,
  },
  {
    question: `How long does it take to see results for a ${short.toLowerCase()}?`,
    answer: `Most ${short.toLowerCase()}s see their first customer post within 48 hours of launching. Measurable lifts in review count, Instagram mentions, and foot traffic typically show up within the first 14 days — which is why we let you try the entire platform free for two weeks.`,
  },
];

export const INDUSTRY_PAGES: IndustryPage[] = [
  {
    slug: "restaurant-marketing-software",
    industry: "Restaurant",
    industryShort: "Restaurant",
    metaTitle: "Restaurant Marketing Software — Get Diners Posting About You",
    metaDescription: "Restaurant marketing software that turns diners into your social media team. Free trial, no credit card required.",
    heroPain: "Your food looks incredible on Instagram. But your diners aren't posting it. Social Perks fixes that — automatically.",
    heroSubhead: "The restaurant marketing platform that gets every table sharing your dishes, reviewing on Google, and bringing back their friends.",
    builtForSection: {
      intro: "Most marketing software was built for ecommerce stores. Social Perks was built for restaurants — for the realities of table turns, service rushes, and the moment between dessert and the check.",
      features: [
        { title: "Table-tent QR codes that don't feel cheesy", description: "Beautifully designed table cards and check-presenter inserts. Customers scan after dessert, pick a perk (free dessert next visit, comped coffee, $10 off), and post in under 30 seconds — without your server ever asking." },
        { title: "Dish-specific Instagram campaigns", description: "Highlight a new menu item, a seasonal special, or your signature dish. Customers who post that specific dish on Instagram with your geotag get an instant perk credited to their next visit." },
        { title: "Google review automation for the post-meal moment", description: "The best time to ask for a review is right after a great meal. We text the perk offer 90 minutes after the bill — landing while the experience is still fresh, not three days later." },
        { title: "Repeat-visit perk wallets", description: "Every perk earned lives in the customer's digital wallet. They come back to redeem — which means every Instagram post becomes a guaranteed return visit." },
      ],
    },
    campaigns: [
      { name: "The Dessert Post", perk: "Free dessert on your next visit", action: "Post a photo of your meal on Instagram and tag the restaurant" },
      { name: "Google Review Sprint", perk: "$10 off your next $40 check", action: "Leave a 4 or 5-star Google review with a photo" },
      { name: "Bring a Friend Thursday", perk: "Free appetizer for both of you", action: "Share the restaurant on your story and bring a new friend in within 14 days" },
      { name: "New Menu Launch", perk: "Free glass of wine with the new dish", action: "Post a reel of the new seasonal entree" },
      { name: "Birthday Brigade", perk: "Comped dessert and a Champagne toast", action: "Tag the restaurant in your birthday dinner post" },
    ],
    differentiator: {
      intro: "Generic marketing software treats your restaurant like a CRM contact list. Social Perks treats it like the service business it actually is.",
      points: [
        { title: "We understand the rhythm of a meal", body: "Most marketing platforms send promotions at random times. We trigger them at the natural moments — after dessert, on the receipt, at the door — when customers are happiest and most likely to act." },
        { title: "Built for high-touch hospitality", body: "Your servers shouldn't be hawking review requests. Our QR codes and SMS flows do the asking, so your team can focus on the meal." },
        { title: "Perks that protect your margin", body: "We help you choose perks (a free side, a coffee, a dessert) that cost you $1-3 in food cost but feel premium to the guest. No more 50% off coupons that train customers to wait for discounts." },
      ],
    },
    testimonials: [
      { quote: "We went from 80 Google reviews to 340 in four months. And every Saturday is now a full house — half of them came in because they saw a friend's Instagram story.", author: "Marco P.", business: "Trattoria Sorrento", location: "Brooklyn, NY", result: "+260 Google reviews in 4 months" },
      { quote: "I was spending $1,800/mo on Facebook ads. Switched to Social Perks for $49/mo and got more reservations in the first month than I did all of last quarter.", author: "Aisha K.", business: "Saffron Kitchen", location: "Austin, TX", result: "-95% acquisition cost" },
      { quote: "The dessert perk is genius. We give away maybe $40 of tiramisu a week and get back $3,000 in new diners. My accountant cried happy tears.", author: "Giuseppe R.", business: "Forno Rustico", location: "Chicago, IL", result: "75x ROI on perk spend" },
    ],
    faqs: baseFAQs("Restaurant", "Restaurant"),
  },
  {
    slug: "coffee-shop-marketing-platform",
    industry: "Coffee Shop",
    industryShort: "Coffee Shop",
    metaTitle: "Coffee Shop Marketing Platform — Build a Cult Following",
    metaDescription: "Coffee shop marketing software for indie cafes and roasters. Turn your regulars into your social media team. Free 14-day trial.",
    heroPain: "Your latte art belongs on Instagram. Your regulars are taking the photos already — they're just not tagging you. Social Perks gives them a reason to.",
    heroSubhead: "The coffee shop marketing platform that turns your morning rush into a content engine.",
    builtForSection: {
      intro: "Built specifically for indie cafes, roasters, and specialty coffee shops. We know the difference between a flat white and a cortado, and we know your customers do too.",
      features: [
        { title: "Loyalty perks that compound with social posts", description: "Replace the punch card. Customers earn free drinks faster when they tag you in their morning latte photo. Average regulars post 3x more after enrolling." },
        { title: "Roaster collab campaigns", description: "Featuring a guest roaster this month? Launch a campaign in 30 seconds — customers who post about the new beans get a free bag to take home." },
        { title: "Story-friendly QR cards", description: "Designed to live on counters and tip jars without screaming 'marketing.' Customers see them, scan them, and never feel like they're being sold to." },
        { title: "Morning-rush automation", description: "Our system queues posts to publish during peak Instagram hours (7-9am for coffee), maximizing reach without you lifting a finger." },
      ],
    },
    campaigns: [
      { name: "Latte Art Monday", perk: "Free drink upgrade (oat milk, extra shot)", action: "Post a photo of your latte on your story and tag the shop" },
      { name: "New Bean Drop", perk: "Free 8oz bag of the featured roast", action: "Post a reel trying the new single-origin and tag the roaster" },
      { name: "Refer a Coffee Friend", perk: "Buy one, get one free for both of you", action: "Bring a new face in and have them mention your name at the counter" },
      { name: "Saturday Sunshine Post", perk: "Free pastry with any drink", action: "Tag the shop in a weekend morning Instagram story" },
      { name: "Google Review for Beans", perk: "10% off your next bag of whole beans", action: "Leave a Google review mentioning a specific drink or barista" },
    ],
    differentiator: {
      intro: "Coffee is culture. Generic marketing tools treat it like a transaction. We don't.",
      points: [
        { title: "Built for the regular, not the one-time visitor", body: "85% of coffee shop revenue comes from regulars. Our perks reward repeat behavior, not just first-time signups." },
        { title: "Designed for your aesthetic", body: "QR codes, signage, and campaign assets you'd actually put on your counter. No clip art, no Comic Sans, no compromise." },
        { title: "Roaster and farm-relationship friendly", body: "Tag your roaster, tag the farm, build the story. We make it easy to credit the supply chain in every campaign." },
      ],
    },
    testimonials: [
      { quote: "We're a six-table cafe in a town of 8,000 people. Social Perks got us to 1,200 Instagram followers and a waiting list for our pour-over flights. I don't know how this happened.", author: "Lena M.", business: "Field Notes Coffee", location: "Burlington, VT", result: "1,200 new IG followers in 90 days" },
      { quote: "I run a roaster and a cafe. Used to drop $400/mo on Instagram ads. Now I spend nothing — our customers post for us, and the engagement is 10x better.", author: "Devon T.", business: "North Roast Co.", location: "Portland, OR", result: "$0 ad spend, 10x engagement" },
      { quote: "The new bean drop campaign sold out our Ethiopia Yirgacheffe in 6 days. We usually take 3 weeks. The posts did all the work.", author: "Hana B.", business: "Slow Pour", location: "Asheville, NC", result: "Bean drop sold out 3x faster" },
    ],
    faqs: baseFAQs("Coffee Shop", "Coffee Shop"),
  },
  {
    slug: "yoga-studio-marketing-software",
    industry: "Yoga Studio",
    industryShort: "Yoga Studio",
    metaTitle: "Yoga Studio Marketing Software — Fill Every Class",
    metaDescription: "Yoga studio marketing platform that gets your community posting, sharing, and referring. Built for studio owners. Free trial.",
    heroPain: "Your community is your marketing. They just need a nudge. Social Perks gives them one — without making it feel transactional.",
    heroSubhead: "The yoga studio marketing platform that fills classes, sells memberships, and grows your community without burning out.",
    builtForSection: {
      intro: "Built for independent yoga studios, hot yoga, vinyasa, restorative — and the teachers who'd rather be on the mat than in a spreadsheet.",
      features: [
        { title: "Class-fill campaigns", description: "Got a half-empty 6am class? Launch a 'first-time free' perk for anyone whose friend posts the class on their story. Fill rates jump 40%+ in our pilot studios." },
        { title: "Teacher-spotlight content", description: "Featured teachers get auto-generated campaigns — students who post a story tagging the teacher get a free class credit. Your teachers become micro-influencers." },
        { title: "New-student onboarding flow", description: "First-class students get a guided post-class flow: rate the class, share a peaceful moment, refer a friend. Each step earns a perk." },
        { title: "Workshop and retreat promotion", description: "Selling a weekend workshop? Members who share it on Instagram get $20 off their own ticket. Workshops fill in days, not weeks." },
      ],
    },
    campaigns: [
      { name: "First Class Free Friend", perk: "Free first class for the friend, free class credit for the member", action: "Tag a friend in a story about your favorite class" },
      { name: "Studio Glow-Up", perk: "Free yoga sock from the boutique", action: "Post a photo of your post-class moment and tag the studio" },
      { name: "Teacher Tribute", perk: "Free class with the teacher you tagged", action: "Post a Google review mentioning a specific teacher by name" },
      { name: "Workshop Buzz", perk: "$20 off the workshop you shared", action: "Share the workshop poster to your story 7 days before the event" },
      { name: "Membership Anniversary", perk: "Free month of unlimited classes", action: "Post a reflection on your one-year membership and tag the studio" },
    ],
    differentiator: {
      intro: "Yoga is intimate. Marketing software usually isn't. We bridge that.",
      points: [
        { title: "Tone-aware perks", body: "We don't push aggressive discount language. Our copy and campaigns feel like an invitation, not a sales pitch — because that's what fills a yoga class." },
        { title: "Teacher-friendly", body: "Teachers get visibility for their classes without becoming social media managers. Students post about them naturally, with perks routing through the studio." },
        { title: "Membership-aware", body: "We don't cannibalize your unlimited members with discount campaigns. Perks are layered to reward existing members differently from new students." },
      ],
    },
    testimonials: [
      { quote: "We filled our 6am class for the first time in two years. The friend-referral perk is unreal. I wish we'd done this when we opened.", author: "Priya S.", business: "Breath & Balance Studio", location: "Denver, CO", result: "6am class fill rate +68%" },
      { quote: "Sold out our spring retreat in 11 days. Members shared it organically because the perk for sharing was a $50 retreat credit. The math worked on the first try.", author: "Amelia F.", business: "Roots Yoga", location: "Santa Cruz, CA", result: "Retreat sold out in 11 days" },
      { quote: "I was about to hire a marketing person. Found Social Perks instead, saved $4,000/mo, and our class attendance is up 38%.", author: "Jonas H.", business: "Heat & Hold Yoga", location: "Phoenix, AZ", result: "+38% class attendance" },
    ],
    faqs: baseFAQs("Yoga Studio", "Yoga Studio"),
  },
  {
    slug: "salon-marketing-platform",
    industry: "Salon",
    industryShort: "Salon",
    metaTitle: "Salon Marketing Platform — Fill Your Chair Every Day",
    metaDescription: "Salon marketing software for hair, color, and beauty. Turn every client into your best advertisement. Free 14-day trial.",
    heroPain: "Your clients walk out looking incredible. They post the photo, but tag themselves — not you. Social Perks changes that, instantly.",
    heroSubhead: "The salon marketing platform that turns every blowout, color, and cut into a client-acquisition machine.",
    builtForSection: {
      intro: "Built for independent salons, suite stylists, and small chains who know that great hair is the only marketing that actually works.",
      features: [
        { title: "Before-and-after post automation", description: "Send the post-service text within 10 minutes of the appointment. Client posts the transformation, tags the salon and stylist, gets a $15 credit on next service." },
        { title: "Stylist-level campaigns", description: "Each stylist gets their own campaign dashboard. New clients booked from their content earn them a referral bonus — finally, marketing that helps the stylist, not just the front desk." },
        { title: "Color-formula confidence", description: "Color clients are your highest-value bookings. We trigger review and referral asks specifically after color services, when satisfaction is highest." },
        { title: "Booking-link integration", description: "Friends who click through from a tagged post land directly on your booking page with the perk pre-applied. No code-typing, no lost conversions." },
      ],
    },
    campaigns: [
      { name: "The Glow Post", perk: "$15 credit on your next service", action: "Post your post-appointment selfie and tag the salon and stylist" },
      { name: "Bring Your Bestie", perk: "Both get 20% off your next service together", action: "Share the salon on your story and book a friend within 14 days" },
      { name: "Color Confidence Review", perk: "Free deep-conditioning add-on next visit", action: "Leave a Google review with your color photo within 48 hours" },
      { name: "Stylist Spotlight", perk: "Free blowout with the tagged stylist", action: "Post a reel of your service and tag the stylist's Instagram" },
      { name: "Wedding-Season Referral", perk: "$50 off bridal trial when 3 friends book", action: "Refer 3 bridal-party friends who book trials" },
    ],
    differentiator: {
      intro: "Most salon software is built for booking. Social Perks is built for the part that matters most: getting new clients in the chair.",
      points: [
        { title: "Stylist-first revenue sharing", body: "Perks credit the specific stylist who did the work. They see their own funnel, their own referrals, their own growth — a real reason to participate." },
        { title: "Designed for the post-service moment", body: "We time the ask perfectly: 10 minutes after the chair, when the client is happiest. Not three days later when they've forgotten." },
        { title: "Brand-safe content review", body: "Posts get AI-screened before they count toward a perk. No blurry pics, no off-brand backgrounds, no mistakes that make your salon look unprofessional." },
      ],
    },
    testimonials: [
      { quote: "I added 47 new color clients in two months. From Instagram. Without spending a dollar on ads. The 'bring your bestie' campaign filled my Saturdays for the rest of the quarter.", author: "Camille R.", business: "Tone & Mood Studio", location: "Nashville, TN", result: "+47 color clients in 60 days" },
      { quote: "My stylists love it. They actually get credit for the clients they bring in. Two of them have already paid off their suite rent just from referrals.", author: "Vanessa O.", business: "Suite 12 Salon Collective", location: "Miami, FL", result: "Stylists covering rent via referrals" },
      { quote: "We're booked 3 weeks out for the first time in five years of business. I literally don't know what to do with the demand.", author: "Marisol G.", business: "Bloom Salon", location: "Seattle, WA", result: "Booked out 3 weeks consistently" },
    ],
    faqs: baseFAQs("Salon", "Salon"),
  },
  {
    slug: "gym-marketing-software",
    industry: "Gym",
    industryShort: "Gym",
    metaTitle: "Gym Marketing Software — Fill Memberships, Cut Churn",
    metaDescription: "Gym marketing platform for boutique studios, CrossFit boxes, and independent gyms. Member-powered growth. Free trial.",
    heroPain: "Your members already love your gym. They post their workouts everywhere — just not in a way that brings new members in. Social Perks fixes the link.",
    heroSubhead: "The gym marketing software that turns your members into your most credible sales team.",
    builtForSection: {
      intro: "Built for boutique gyms, CrossFit boxes, F45 affiliates, indie strength gyms, and personal training studios. We know your retention math.",
      features: [
        { title: "PR (personal record) post campaigns", description: "Members hit a PR? Auto-prompt them to post it, tag the gym, get a free month of guest privileges. Turns the most emotional moments into your best marketing." },
        { title: "Bring-a-friend free-week campaigns", description: "The single highest-converting acquisition channel for gyms: a friend's invite. We give your members a perk for getting their friends through the door." },
        { title: "Class-fill automation", description: "Got 4 spots open in tomorrow's 6am? Push a flash campaign — members who share the class fill those spots in under an hour." },
        { title: "Retention-protecting offboarding", description: "Member cancels? Trigger a 'come back' perk flow tied to a friend's post. We win back 18% of cancellations on average." },
      ],
    },
    campaigns: [
      { name: "PR Post Party", perk: "Free month of guest privileges (one friend per week)", action: "Post your PR with the gym tagged and the lift in the caption" },
      { name: "Free Week Friend", perk: "Free week for the friend, $25 credit for the member", action: "Invite a friend through your unique referral link" },
      { name: "Class-Pack Sale", perk: "10-pack at single-class price", action: "Share the limited-time offer on your Instagram story" },
      { name: "Trainer Tribute", perk: "Free PT session with the tagged trainer", action: "Post a Google review naming a trainer who helped you" },
      { name: "Transformation Story", perk: "Three free months of unlimited classes", action: "Post a 90-day before-and-after with the gym tagged" },
    ],
    differentiator: {
      intro: "Gym marketing usually means cold leads and price wars. Social Perks gives you something better: warm referrals from your strongest members.",
      points: [
        { title: "Retention-first math", body: "Acquiring a member through a friend's referral has 3x the LTV of one acquired through paid ads. We optimize for the channel that actually keeps members." },
        { title: "Trainer-friendly", body: "Trainers get visibility, tags, and credit for the work they do. Their personal brand grows, which keeps them at your gym longer." },
        { title: "Designed for the gym aesthetic", body: "QR cards and signage that look at home in your space — no cheesy clipart, no orange-and-yellow discount energy." },
      ],
    },
    testimonials: [
      { quote: "We added 84 members in one quarter from member referrals alone. The bring-a-friend free week converted at 41%. I've never seen a marketing channel that worked this well.", author: "Tyler M.", business: "Iron Compass CrossFit", location: "Boulder, CO", result: "+84 members in one quarter" },
      { quote: "PR posts are everything now. Every Friday is leaderboard day and the gym tag is everywhere. We've cut paid ads to zero.", author: "Sasha L.", business: "Frame Strength Studio", location: "Brooklyn, NY", result: "$0 paid ad spend, growing waitlist" },
      { quote: "I run a 600-member gym. Used to lose 8% of members per month. We're down to 3.2% because the community feels active and visible.", author: "Andre K.", business: "RISE Fitness", location: "Atlanta, GA", result: "Churn cut from 8% to 3.2%" },
    ],
    faqs: baseFAQs("Gym", "Gym"),
  },
  {
    slug: "dental-practice-marketing-software",
    industry: "Dental Practice",
    industryShort: "Dental Practice",
    metaTitle: "Dental Practice Marketing Software — More Patients, More Reviews",
    metaDescription: "Dental marketing platform that grows your practice through patient reviews, referrals, and word-of-mouth. HIPAA-aware. Free trial.",
    heroPain: "Happy patients leave your office and never mention you again. Social Perks gives them a polite, professional nudge — and a perk worth talking about.",
    heroSubhead: "The dental practice marketing software that fills your schedule with new patients through reviews, referrals, and trust.",
    builtForSection: {
      intro: "Built for general dentists, orthodontists, cosmetic practices, and pediatric dentistry. We respect the professional standards your patients expect.",
      features: [
        { title: "Post-appointment review automation", description: "A polite SMS goes out two hours after the appointment, offering a small perk (whitening upgrade, free toothbrush kit) in exchange for an honest Google review. Conversion rates triple industry average." },
        { title: "Referral perks for trusted recommendations", description: "Patients who refer a new patient get a credit toward their next cleaning or cosmetic service. We track the referral chain automatically." },
        { title: "Cosmetic-case before-and-afters", description: "With patient consent, transform cosmetic results into shareable content. Patients who post tagged smile-reveals get a free whitening touch-up." },
        { title: "Compliance-friendly templates", description: "Every template respects professional advertising standards. No exaggerated claims, no testimonial misuse — just polished, ethical patient communications." },
      ],
    },
    campaigns: [
      { name: "Bright Smile Review", perk: "Free professional whitening upgrade", action: "Leave a Google review describing your visit" },
      { name: "New Patient Referral", perk: "$75 credit toward your next service", action: "Refer a new patient who completes their first cleaning" },
      { name: "Family Plan Boost", perk: "Free fluoride treatment for each family member", action: "Book three family members for cleanings in the same month" },
      { name: "Invisalign Reveal", perk: "Free retainer set", action: "Post your Invisalign before-and-after with the practice tagged (with consent)" },
      { name: "Anxiety-Free Testimonial", perk: "$50 credit on next visit", action: "Share a brief written testimonial about your comfortable experience" },
    ],
    differentiator: {
      intro: "Most dental marketing software is built for paid lead generation — and pays per lead, every time. Social Perks builds an asset: a self-sustaining referral engine.",
      points: [
        { title: "Respect for the patient relationship", body: "We never push, never spam, never use pressure tactics. Every ask is timed and worded to feel professional and optional." },
        { title: "Built for high-trust services", body: "Dental decisions are driven by trust, not coupons. Our campaigns earn trust through real patient voices — the only marketing that converts hesitant patients." },
        { title: "Compliance baked in", body: "We're aware of ADA advertising standards and avoid HIPAA-sensitive data. Patients control what they share. You stay in the clear." },
      ],
    },
    testimonials: [
      { quote: "We had 38 Google reviews after eight years. We hit 200 in four months with Social Perks. Our new patient calls jumped 60% the same quarter.", author: "Dr. Rachel W.", business: "Westside Family Dental", location: "Cincinnati, OH", result: "+162 Google reviews in 4 months" },
      { quote: "Our Invisalign cases doubled. Patients post their reveal photos and friends start asking about it the same day. I've never had a marketing channel like this.", author: "Dr. Sanjay P.", business: "Smile Studio Ortho", location: "Plano, TX", result: "Invisalign starts 2x'd" },
      { quote: "We spent $3,200/mo on Google Ads. Switched 80% of that budget to Social Perks. New patient acquisition cost dropped from $340 to $42.", author: "Dr. Lisa O.", business: "Bright Dental Care", location: "Tampa, FL", result: "Patient acquisition cost: $340 to $42" },
    ],
    faqs: baseFAQs("Dental Practice", "Dental Practice"),
  },
  {
    slug: "medical-spa-marketing-software",
    industry: "Medical Spa",
    industryShort: "Med Spa",
    metaTitle: "Medical Spa Marketing Software — Fill Your Treatment Calendar",
    metaDescription: "Med spa marketing platform for injectors, aestheticians, and laser practices. Build your client base through real results. Free trial.",
    heroPain: "Your results speak for themselves — when clients actually post them. Social Perks gets every great outcome on Instagram, with consent and compliance baked in.",
    heroSubhead: "The medical spa marketing platform that grows your aesthetics practice through real client transformations.",
    builtForSection: {
      intro: "Built for medical spas, injector practices, laser clinics, and aesthetic dermatology. We understand the regulatory landscape you operate in.",
      features: [
        { title: "Consent-first treatment posts", description: "Clients opt-in to post their results. We give them the photo, the caption, the FTC disclosure, and a perk for sharing. You get the social proof, they get the discount." },
        { title: "Treatment-specific campaigns", description: "Filler clients get filler-specific perks. Laser clients get laser-specific perks. The system targets the highest-value referral moments by treatment type." },
        { title: "Injector-level dashboards", description: "Each injector sees their own campaigns, their own referrals, their own follower growth. Your practice's top earners become your top marketers." },
        { title: "Membership-program acceleration", description: "Annual membership programs grow 3x faster when members earn extra benefits for posting. We build the loop." },
      ],
    },
    campaigns: [
      { name: "Glow-Up Reveal", perk: "Free Hydrafacial add-on", action: "Post your before-and-after with practice tagged and disclosure" },
      { name: "Refer a Friend to Filler", perk: "$100 off your next treatment", action: "Refer a new client who books a filler consultation" },
      { name: "Membership Anniversary", perk: "Free unit of Botox on your renewal", action: "Post a thank-you reel on your one-year membership" },
      { name: "Laser Series Completion", perk: "Free maintenance treatment", action: "Post a journey reel after completing your full laser series" },
      { name: "Bridal Glow Squad", perk: "Free bridal touchup pre-wedding", action: "Bring 3 bridesmaids for HydraFacials in the month before the wedding" },
    ],
    differentiator: {
      intro: "Med spa marketing is high-cost and high-risk — wrong messaging gets clients, attracts regulators, or both. Social Perks gives you a safer, more sustainable engine.",
      points: [
        { title: "FTC and compliance-aware", body: "Every disclosure is auto-added. Every claim is conservative. We don't promise outcomes — we let real clients show theirs." },
        { title: "Built for high-LTV clients", body: "Med spa clients spend $2,000+ per year. Our perk economics protect that LTV instead of training clients to expect discounts." },
        { title: "Injector and aesthetician friendly", body: "Practitioners build personal brands without leaving your practice. Their wins are your wins." },
      ],
    },
    testimonials: [
      { quote: "We doubled our Botox bookings in 90 days. The membership renewal campaign alone retained 89% of our annual members — up from 64% the year before.", author: "Dr. Olivia C.", business: "Lumen Aesthetics", location: "Scottsdale, AZ", result: "Membership renewals 64% to 89%" },
      { quote: "Our injectors were skeptical. Now they ask me why we didn't launch this sooner. Two of them have grown their personal Instagram by 4,000+ followers.", author: "Mariah F.", business: "Skin & Form Med Spa", location: "Beverly Hills, CA", result: "Injectors +4k IG followers" },
      { quote: "First bridal season using this and we booked out the entire month of May. The bridal squad referral was the single best campaign I've ever run.", author: "Dr. Naomi B.", business: "Glow Med Spa", location: "Charleston, SC", result: "May fully booked from bridal" },
    ],
    faqs: baseFAQs("Medical Spa", "Med Spa"),
  },
  {
    slug: "boutique-marketing-software",
    industry: "Boutique",
    industryShort: "Boutique",
    metaTitle: "Boutique Marketing Software — Turn Shoppers Into Your Sales Team",
    metaDescription: "Marketing software for indie boutiques and small retail. Get customers posting outfits, tagging your store, driving traffic. Free trial.",
    heroPain: "Your customers leave with a perfect outfit. They post it later — without tagging you. Social Perks closes that gap, every time.",
    heroSubhead: "The boutique marketing platform that turns every dressing-room moment into Instagram content and new foot traffic.",
    builtForSection: {
      intro: "Built for indie boutiques, curated retail, and small fashion shops. We know your competition is online — and we know how to beat it.",
      features: [
        { title: "Fit-check post automation", description: "QR codes in the dressing room. Try on three pieces, post a fit-check, get $10 off this purchase or next. Conversion rates rival paid Instagram ads at 1/20th the cost." },
        { title: "New-arrival drop campaigns", description: "New season drop landing this week? Customers who post the launch get first-look access to the next drop. Drives anticipation and FOMO." },
        { title: "VIP customer flywheel", description: "Top spenders get private access to perks, restocks, and previews. They post it, friends notice, friends become customers." },
        { title: "Local-traffic geofencing", description: "Friends of customers within 5 miles get notified when their bestie posts your store. Foot traffic from social posts becomes trackable." },
      ],
    },
    campaigns: [
      { name: "Dressing Room Drop", perk: "$10 off today's purchase or next visit", action: "Post a try-on photo with the boutique tagged" },
      { name: "New Arrival Preview", perk: "First-look access to next drop", action: "Post a reel of your new arrival pick with the brand tagged" },
      { name: "Bring Your Bestie Saturday", perk: "Both get 15% off purchases", action: "Share the boutique on your story and bring a friend in" },
      { name: "Outfit of the Week", perk: "Free accessory of your choice", action: "Post a full outfit using only items from the boutique and tag them" },
      { name: "Holiday Wishlist Share", perk: "$25 store credit", action: "Post your wishlist with three items tagged and visible" },
    ],
    differentiator: {
      intro: "Boutique marketing is brutal — you compete with Shein, Amazon, and every Instagram ad ever made. Social Perks gives you a different weapon: real customers, real outfits, real proof.",
      points: [
        { title: "Built for in-person retail", body: "QR codes, signage, receipts, dressing-room cards — all designed for the physical store moment when intent is highest." },
        { title: "Aesthetic-respecting", body: "Every campaign asset is designed to match a curated boutique aesthetic. Nothing screams 'discount store.'" },
        { title: "Owner-friendly economics", body: "Perks scaled to your margins. We don't suggest 50% off — we suggest a $10 credit or a free scrunchie. The math actually works." },
      ],
    },
    testimonials: [
      { quote: "I run a 600-sq-ft boutique in a small downtown. Social Perks tripled our Instagram following and our Saturday traffic. I don't run Facebook ads anymore.", author: "Hannah R.", business: "Plum & Vine", location: "Asheville, NC", result: "3x Instagram + Saturday traffic" },
      { quote: "Our new arrival drops sell out in 48 hours now. Customers post the previews and the FOMO does the rest. I literally restock and the racks are empty by Friday.", author: "Marisol J.", business: "Loose Threads", location: "Austin, TX", result: "Drops selling out in 48hrs" },
      { quote: "Bring-your-bestie Saturdays added $4,800/mo to our revenue in the first quarter. The math is so good I can barely believe it.", author: "Sarah O.", business: "Field Day Boutique", location: "Charleston, SC", result: "+$4,800/mo Saturday revenue" },
    ],
    faqs: baseFAQs("Boutique", "Boutique"),
  },
  {
    slug: "bakery-marketing-software",
    industry: "Bakery",
    industryShort: "Bakery",
    metaTitle: "Bakery Marketing Software — Sell Out Every Day",
    metaDescription: "Bakery marketing platform for indie bakeries, pastry shops, and bread bakeries. Sell out faster, build a following. Free trial.",
    heroPain: "Your croissants are photogenic. Your customers know it. Social Perks gets them posting, tagging, and bringing the whole neighborhood in.",
    heroSubhead: "The bakery marketing platform that turns every morning rush into a content engine and every loaf into a viral moment.",
    builtForSection: {
      intro: "Built for indie bakeries, pastry shops, bread bakeries, donut shops, and cake studios. We know the rhythm of baker's hours — and we work around it.",
      features: [
        { title: "Daily-bake post campaigns", description: "What's coming out of the oven today? Customers who post that day's special before 11am get first dibs on tomorrow's batch. Drives morning traffic and follower count." },
        { title: "Preorder and pickup integration", description: "Customers who preorder weekly bread get a perk for posting their pickup. Builds a subscription-style relationship from your busiest customers." },
        { title: "Custom-cake referral system", description: "Custom-cake clients post the finished cake, tag the bakery, and refer the next event customer. Each referred order earns them a free dozen cookies." },
        { title: "Sold-out alert sharing", description: "Sold out by 1pm? Customers who share the 'sold out' Instagram story get priority access to tomorrow. Scarcity becomes a marketing channel." },
      ],
    },
    campaigns: [
      { name: "Morning Croissant Post", perk: "Free almond croissant with tomorrow's coffee order", action: "Post a photo of today's pastry before noon" },
      { name: "Loaf of the Week", perk: "Free $8 loaf next week", action: "Post a story of your weekly bread pickup and tag the bakery" },
      { name: "Cake Reveal Tag", perk: "Free dozen cookies for your next event", action: "Post your custom cake at the event and tag the bakery" },
      { name: "Sold-Out Story Share", perk: "Saved batch tomorrow morning", action: "Share the 'sold out today' story to your own followers" },
      { name: "Birthday Pickup", perk: "Free birthday-candle pack", action: "Post your birthday cake from the bakery and tag the team" },
    ],
    differentiator: {
      intro: "Bakery marketing usually means flyers and Facebook posts that nobody sees. Social Perks turns every loaf and pastry into a content asset that actually drives walk-ins.",
      points: [
        { title: "Built for daily product cycles", body: "We push campaigns at baker's hours — 6am SMS to overnight regulars, 9am Instagram boost when croissants land. Generic schedulers can't do this." },
        { title: "Sold-out economics", body: "Most marketing tools panic when you sell out. We use it as fuel. A 'sold out by 1pm' post is your best ad for tomorrow's batch." },
        { title: "Custom-order friendly", body: "Wedding cakes, birthday orders, holiday boxes — each one is a marketing event. We turn each completed custom into your next referral." },
      ],
    },
    testimonials: [
      { quote: "We sell out by 11am most days now. Our morning post campaign 4x'd our Instagram following and our regulars actually beat the post-brunch crowd to the counter.", author: "Maria C.", business: "Hearth & Crumb", location: "Phoenix, AZ", result: "Selling out by 11am consistently" },
      { quote: "Our custom cake orders doubled. Every wedding cake becomes 3-4 referral inquiries within a week of the wedding. I had to hire a second decorator.", author: "Olivia M.", business: "Sugar Plum Cake Studio", location: "Nashville, TN", result: "Custom cake orders 2x'd" },
      { quote: "I run a sourdough bakery with one oven. Sold out our weekly loaf subscriptions in 9 days after launching the campaign. I'm bread-rich for the first time ever.", author: "Thomas W.", business: "Slow Rise Bread Co.", location: "Portland, OR", result: "Subscription sold out in 9 days" },
    ],
    faqs: baseFAQs("Bakery", "Bakery"),
  },
  {
    slug: "florist-marketing-software",
    industry: "Florist",
    industryShort: "Florist",
    metaTitle: "Florist Marketing Software — Bloom Every Season",
    metaDescription: "Florist marketing platform for indie shops, wedding florists, and event designers. Turn arrangements into Instagram gold. Free trial.",
    heroPain: "Your arrangements are unforgettable — but only your recipient sees them. Social Perks gets the recipient, the sender, and the wedding party posting and tagging you.",
    heroSubhead: "The florist marketing platform that turns every bouquet, centerpiece, and wedding into your next client inquiry.",
    builtForSection: {
      intro: "Built for indie florists, wedding designers, event florists, and grocery-store competitors. We turn arrangements into content into bookings.",
      features: [
        { title: "Recipient-post campaigns", description: "QR card in every delivery: 'post your bouquet, tag us, get $10 off your next order.' The recipient becomes a marketer for the next sender." },
        { title: "Wedding-portfolio engine", description: "Brides post their florals, tag your shop, and earn a free anniversary bouquet. Every wedding becomes your next 5-10 inquiries." },
        { title: "Seasonal subscription growth", description: "Weekly-flower subscribers get perks for posting their refresh. Subscriptions grow 3x faster when there's a sharing incentive built in." },
        { title: "Sympathy-and-event tact", description: "Different campaign tone for sympathy arrangements vs. weddings vs. birthdays. Tone matters in floral — generic software ruins this. We don't." },
      ],
    },
    campaigns: [
      { name: "Bouquet Reveal", perk: "$10 off your next order", action: "Post your bouquet photo and tag the florist" },
      { name: "Wedding Florals Feature", perk: "Free first-anniversary bouquet", action: "Post your wedding florals and tag the florist within 30 days" },
      { name: "Subscription Selfie", perk: "Free vase upgrade", action: "Post your weekly arrangement refresh on your story" },
      { name: "Event Tag", perk: "$50 credit toward your next event order", action: "Tag the florist in your event reveal post" },
      { name: "Mother's Day Refer", perk: "Free Mother's Day bouquet of your own", action: "Refer 3 friends who order Mother's Day arrangements" },
    ],
    differentiator: {
      intro: "Florist marketing software is usually just delivery routing. Social Perks gives you the missing piece: a steady inquiry pipeline from existing customers.",
      points: [
        { title: "Built for the visual nature of floral", body: "Every campaign asset assumes a beautiful photo will be taken. We optimize for the Instagram moment, not the email click." },
        { title: "Wedding-and-event aware", body: "High-value bookings deserve special handling. We segment campaigns by occasion and value tier automatically." },
        { title: "Subscription growth built in", body: "Most florists don't have a recurring revenue line. Our subscription campaigns make weekly flower delivery a habit, not a one-time gift." },
      ],
    },
    testimonials: [
      { quote: "Our weekly subscription grew from 22 customers to 134 in five months. Every subscriber posts their refresh and three friends want one. I can't keep up.", author: "Elena R.", business: "Wildflower Studio", location: "Portland, OR", result: "Subscriptions 22 to 134" },
      { quote: "Wedding inquiries tripled. Every wedding I do, I get 5-8 inquiries from the bridal party's Instagram posts. My booking calendar is full through next September.", author: "Aria K.", business: "Petal & Stem Co.", location: "Charleston, SC", result: "Wedding inquiries 3x'd" },
      { quote: "I'm a one-woman shop. Social Perks gives me a marketing team for $49/mo. I went from $4k/mo to $11k/mo in revenue in six months. No exaggeration.", author: "Helena O.", business: "Brackenleaf Flowers", location: "Burlington, VT", result: "Revenue $4k to $11k/mo" },
    ],
    faqs: baseFAQs("Florist", "Florist"),
  },
  {
    slug: "brewery-marketing-software",
    industry: "Brewery",
    industryShort: "Brewery",
    metaTitle: "Brewery Marketing Software — Fill Your Taproom",
    metaDescription: "Brewery marketing platform for craft breweries, taprooms, and beer halls. Turn every pint into a post. Free 14-day trial.",
    heroPain: "Your IPAs are world-class. Your taproom is empty on Tuesdays. Social Perks fills the slow nights and grows your following with the customers you already have.",
    heroSubhead: "The brewery marketing platform that turns every pour, release, and taproom moment into community-driven growth.",
    builtForSection: {
      intro: "Built for craft breweries, microbreweries, taprooms, beer halls, and brewpubs. We understand release-day chaos and Tuesday-night silence.",
      features: [
        { title: "Release-day virality", description: "New beer dropping? Customers who post the release pour get a free can to take home. Releases sell out faster, lines grow longer." },
        { title: "Slow-night fill campaigns", description: "Tuesday night dead? Push a 'bring a friend Tuesday' perk and watch the taproom fill. Our pilot breweries see Tuesday revenue jump 65%+." },
        { title: "Untappd integration friendly", description: "We work alongside your existing beer-tracking apps. Customers who check in and post on their own platforms get rewarded once for both." },
        { title: "Crowler and to-go campaigns", description: "Drive growler refills and to-go cans with perks tied to social posts. Your highest-margin sales become your most shareable." },
      ],
    },
    campaigns: [
      { name: "Release Day Pour", perk: "Free can of the new release", action: "Post the new beer reveal in the taproom and tag the brewery" },
      { name: "Bring a Friend Tuesday", perk: "Free flight for both of you", action: "Bring a new face Tuesday and share the night on your story" },
      { name: "Crowler Take-Home", perk: "Free crowler fill", action: "Post a photo of your crowler at home and tag the brewery" },
      { name: "Brewery Tour Tag", perk: "Free pint at the next visit", action: "Post a reel from the brewery tour and tag the brewmaster" },
      { name: "Trivia Night Win", perk: "Free pitcher next visit", action: "Post your team's trivia win and tag the brewery" },
    ],
    differentiator: {
      intro: "Brewery marketing software usually means email blasts about your next release. Social Perks creates the actual buzz that makes releases events.",
      points: [
        { title: "Community-first", body: "Breweries are gathering places. Our campaigns reward bringing people together — not transactional discounts that train customers to wait." },
        { title: "Release-day optimized", body: "We know release days are unpredictable. Our campaigns flex to demand, surge when lines form, and pull back when you sell out." },
        { title: "Brewer-friendly creative", body: "Every asset, QR card, and campaign template designed to fit your brewery aesthetic. Nothing screams 'corporate marketing.'" },
      ],
    },
    testimonials: [
      { quote: "Our Tuesday nights used to be a ghost town. Now we have a 30-minute wait for tables. The bring-a-friend Tuesday campaign saved our weekday revenue.", author: "Calvin R.", business: "Foothill Brewing Co.", location: "Asheville, NC", result: "Tuesday revenue +120%" },
      { quote: "Last release sold out in 3 hours instead of 3 days. The line wrapped around the building because of the Instagram posts the day before.", author: "Jenna H.", business: "Long Way Round Brewing", location: "Bend, OR", result: "Release sold out 24x faster" },
      { quote: "We're a 4-tap nano. Social Perks made us look like we have a marketing team. Our Instagram went from 600 followers to 4,200 in a year.", author: "Mike P.", business: "Smoke & Mirror Beer", location: "Burlington, VT", result: "+3,600 Instagram followers" },
    ],
    faqs: baseFAQs("Brewery", "Brewery"),
  },
  {
    slug: "bar-marketing-software",
    industry: "Bar",
    industryShort: "Bar",
    metaTitle: "Bar Marketing Software — Pack the House Every Night",
    metaDescription: "Bar marketing platform for cocktail bars, dive bars, and lounges. Drive nightly traffic through social. Free 14-day trial.",
    heroPain: "Your cocktails are Instagram-worthy. Your customers post other bars more than yours. Social Perks flips that — overnight.",
    heroSubhead: "The bar marketing platform that turns every cocktail, happy hour, and Saturday night into shareable content and repeat traffic.",
    builtForSection: {
      intro: "Built for cocktail bars, dive bars, lounges, sports bars, and wine bars. We know the difference between a Tuesday crowd and a Friday crowd — and we drive both.",
      features: [
        { title: "Signature-cocktail campaigns", description: "Your craft cocktails deserve Instagram love. Customers who post the drink with the bar tagged earn their next cocktail free. Your menu becomes its own marketing." },
        { title: "Happy-hour fill mechanics", description: "Push perks during slow hours, pull back during peak. Happy hour fills earlier, busier, and with the friends-of-regulars who become tomorrow's regulars." },
        { title: "Event-night amplification", description: "Trivia night, karaoke, live music — every event becomes a content moment. Posters of the event get perks the next time they come in." },
        { title: "Group-booking perks", description: "Birthday groups, work parties, bachelorettes. Each group leader gets a perk for posting the night. Group bookings grow 3x faster." },
      ],
    },
    campaigns: [
      { name: "Signature Sip Share", perk: "Free cocktail on your next visit", action: "Post your signature cocktail with the bar tagged" },
      { name: "Happy Hour Squad", perk: "Free appetizer round", action: "Bring 3+ friends to happy hour and tag the bar" },
      { name: "Trivia Champions", perk: "Free pitcher for the winning team", action: "Post your trivia night win and tag the bar" },
      { name: "Birthday Bash", perk: "Free shot round for the table", action: "Tag the bar in your birthday celebration post" },
      { name: "Live Music Tag", perk: "Free first drink at the next show", action: "Post a clip from live music night and tag the band + bar" },
    ],
    differentiator: {
      intro: "Bar marketing software is usually just POS reports. Social Perks builds the actual demand that fills your bar.",
      points: [
        { title: "Built for the moment of the pour", body: "Our QR cards live on the bar, the table, the back of the receipt. The post happens while the cocktail is in hand — not three days later." },
        { title: "Designed for nightlife aesthetics", body: "Every asset matches your bar's vibe — neon, minimalist, vintage, or speakeasy. Nothing breaks the atmosphere." },
        { title: "Group-bookings amplified", body: "Birthday and group bookings are 5x more profitable than walk-ins. We build the perks that bring them back, with their friends, again and again." },
      ],
    },
    testimonials: [
      { quote: "Friday nights were already busy. Now Tuesdays look like Fridays. The happy-hour squad perk brings in 30-40 new faces every week.", author: "Dante R.", business: "The Velvet Knob", location: "Brooklyn, NY", result: "Tuesdays now match Fridays" },
      { quote: "Our trivia night went from 6 teams to 22 teams in two months. The bar is packed and the bar tab numbers are obscene.", author: "Lila S.", business: "Last Call Lounge", location: "Austin, TX", result: "Trivia teams 6 to 22" },
      { quote: "Bachelorette parties are now our top revenue category. The 'birthday bash' campaign brings groups in every weekend. My GM is begging for more staff.", author: "Hassan O.", business: "Smoke & Stir", location: "Nashville, TN", result: "Bachelorette bookings top category" },
    ],
    faqs: baseFAQs("Bar", "Bar"),
  },
  {
    slug: "food-truck-marketing-software",
    industry: "Food Truck",
    industryShort: "Food Truck",
    metaTitle: "Food Truck Marketing Software — Build a Following That Follows You",
    metaDescription: "Food truck marketing platform that tells fans where you'll be, gets them posting, and fills your line every stop. Free trial.",
    heroPain: "You move every day. Your customers don't always know where to find you. Social Perks builds the loyal following that shows up before you even park.",
    heroSubhead: "The food truck marketing platform that turns every stop into a sold-out service and every bite into a tagged post.",
    builtForSection: {
      intro: "Built for food trucks, mobile vendors, pop-ups, and farmers market regulars. We know location is your biggest variable — and we work with it.",
      features: [
        { title: "Location-drop campaigns", description: "Announce where you'll be tomorrow. Customers who share the location post get $5 off their order when they show up. Your followers become your stop-by-stop marketing." },
        { title: "Line-photo amplification", description: "A long line is the best ad. Customers in line who post the wait get free drinks at the window. Lines look longer, social proof grows, more people stop." },
        { title: "Festival and event prep", description: "Booked at a food festival? Pre-event campaigns flood your booth with people who already know what to order. No more weak first hour." },
        { title: "Subscription-style perks", description: "Build a 'truck pass' loyalty program — frequent customers earn perks for posting each stop. Your top fans become your traveling marketing team." },
      ],
    },
    campaigns: [
      { name: "Tomorrow's Stop Share", perk: "$5 off your order at tomorrow's stop", action: "Share the location post on your story 24 hours ahead" },
      { name: "Line of Truth", perk: "Free drink with your order", action: "Post a photo of the line at the window and tag the truck" },
      { name: "Menu Hero Tag", perk: "Free side at next visit", action: "Post a photo of your meal in front of the truck" },
      { name: "Festival First-Bite", perk: "Free taco/sandwich/special on the next stop", action: "Tag the truck in your festival post" },
      { name: "Frequent Fan Pass", perk: "10th meal free", action: "Post and tag for 10 different stops to fill the pass" },
    ],
    differentiator: {
      intro: "Food truck marketing software is usually generic restaurant tools that ignore your biggest challenge: location. Social Perks is built around it.",
      points: [
        { title: "Location-aware everything", body: "Every campaign respects that you move. Our system pushes perks geographically, schedules around your route, and tracks which stops convert best." },
        { title: "Built for the mobile fan", body: "Your best customers will drive across town to find you. We give them the tools (and the perks) to do it — and to bring friends." },
        { title: "Festival-and-event ready", body: "We know one festival can make or break a month. Pre-event campaigns help you sell out — and post-event campaigns keep those new fans following." },
      ],
    },
    testimonials: [
      { quote: "I have 18,000 Instagram followers and they actually show up. Last Saturday's stop sold out in 90 minutes because the location share campaign worked overnight.", author: "Carlos M.", business: "Tres Hermanos Tacos", location: "Austin, TX", result: "Sold out in 90 minutes" },
      { quote: "Festivals used to be hit-or-miss. Now I pre-sell my best meals through campaigns and we hit revenue targets in the first 3 hours. Total game-changer.", author: "Sofia L.", business: "Birria Bandit", location: "Los Angeles, CA", result: "Festival targets hit in 3 hours" },
      { quote: "Frequent fan pass is the best thing I've ever launched. I have 240 customers actively chasing my truck around the city.", author: "Reggie T.", business: "Smoke Wagon BBQ", location: "Nashville, TN", result: "240 active fan-pass chasers" },
    ],
    faqs: baseFAQs("Food Truck", "Food Truck"),
  },
  {
    slug: "tattoo-shop-marketing-software",
    industry: "Tattoo Shop",
    industryShort: "Tattoo Shop",
    metaTitle: "Tattoo Shop Marketing Software — Book Your Artists Out for Months",
    metaDescription: "Tattoo shop marketing platform for artists and shops. Book out your calendar through Instagram and word-of-mouth. Free trial.",
    heroPain: "Your artists' work is incredible. The Instagram algorithm doesn't care. Social Perks bypasses it — letting your clients do the posting that actually drives bookings.",
    heroSubhead: "The tattoo shop marketing platform that fills your artists' books through real client-posted work, not paid social ads.",
    builtForSection: {
      intro: "Built for tattoo shops, custom artists, and piercing studios. We respect the artist-first culture that makes your shop different.",
      features: [
        { title: "Healed-tattoo post campaigns", description: "Fresh tattoo photos are fine. Healed-tattoo photos drive bookings. Clients who post their healed piece 30 days later (with the artist tagged) earn $50 off their next session." },
        { title: "Artist-level booking funnels", description: "Each artist has their own dashboard. Their posts, their referrals, their booking funnel. Top artists become micro-celebrities — bringing the whole shop more clients." },
        { title: "Flash-day amplification", description: "Hosting flash day? Pre-event campaigns fill every artist's appointment slot. We've seen flash days book out in 4 hours instead of 4 days." },
        { title: "Consultation referral system", description: "Custom-piece consultations have a long closing cycle. We keep prospects warm with perks tied to friend referrals while they're deciding." },
      ],
    },
    campaigns: [
      { name: "Healed Reveal", perk: "$50 credit on your next session", action: "Post your healed tattoo 30 days later with artist tagged" },
      { name: "Flash Day Booking", perk: "Free aftercare kit", action: "Share the flash day poster on your story 48 hours before" },
      { name: "Artist Spotlight Review", perk: "Free small piece consultation", action: "Post a Google review naming a specific artist" },
      { name: "Bring a Tattoo Friend", perk: "10% off both your next sessions", action: "Refer a friend who books a consultation" },
      { name: "Custom Piece Reveal", perk: "Free touch-up at 6 months", action: "Post a reel of your custom piece reveal day" },
    ],
    differentiator: {
      intro: "Most marketing software treats tattoo shops like generic small businesses. We respect the culture — and we respect the artists.",
      points: [
        { title: "Artist-first revenue sharing", body: "Perks credit the artist who did the work. Artists see their own pipeline, their own marketing wins. They want to participate because it grows their personal brand." },
        { title: "Respect for the craft", body: "We don't use discount-store language or push aggressive sales copy. Our campaigns match the culture — referential, respectful, real." },
        { title: "Built for long booking cycles", body: "Tattoos aren't impulse buys. Our system keeps prospects engaged through long decision cycles without spamming them." },
      ],
    },
    testimonials: [
      { quote: "Our shop is booked out 4 months. Every artist has a waitlist. The healed-tattoo campaign alone added 200+ tagged posts to our Instagram in a quarter.", author: "Ink R.", business: "Black Crow Tattoo Co.", location: "Brooklyn, NY", result: "Booked out 4 months solid" },
      { quote: "Flash day used to take a week to fill. Now we sell out in an afternoon. The pre-event campaign is genuinely magic.", author: "Mira K.", business: "Heavy Hand Studio", location: "Austin, TX", result: "Flash day sold out in 4 hours" },
      { quote: "I have 6 artists. Each one is bringing in their own clients now because their personal Instagram is growing. Shop revenue up 60% year-over-year.", author: "Jax T.", business: "Forevermark Tattoo", location: "Portland, OR", result: "Revenue +60% YoY" },
    ],
    faqs: baseFAQs("Tattoo Shop", "Tattoo Shop"),
  },
  {
    slug: "auto-shop-marketing-software",
    industry: "Auto Shop",
    industryShort: "Auto Shop",
    metaTitle: "Auto Shop Marketing Software — Fill Your Bays With Loyal Customers",
    metaDescription: "Auto repair shop marketing platform that builds trust and brings customers back. Reviews, referrals, retention. Free trial.",
    heroPain: "Trust is everything in auto repair. Your existing customers know you're honest — but they don't tell anyone. Social Perks gives them an easy way to.",
    heroSubhead: "The auto shop marketing platform that turns every satisfied customer into a Google review, a referral, and a returning patron.",
    builtForSection: {
      intro: "Built for independent auto repair shops, tire centers, lube shops, and body shops. We know your competition is the dealership — and we know how to beat them.",
      features: [
        { title: "Post-service review automation", description: "Polite SMS goes out 24 hours after pickup. Honest review of the experience earns a free oil change next time. Google review counts skyrocket — and so do new-customer calls." },
        { title: "Referral-perk loops", description: "Customers who refer a friend get $25 off their next visit. The friend gets a discount on their first service. The trust loop builds the business that ad budgets can't." },
        { title: "Service-reminder campaigns", description: "Combine service reminders with social-share perks. Customers post 'just got my brakes done — thanks Mike's Auto' and earn their next oil change free." },
        { title: "Trust-building before-and-afters", description: "Body shop work, detail jobs, restorations — customers post the reveal, tag the shop, build the shop's reputation organically." },
      ],
    },
    campaigns: [
      { name: "Honest Review Reward", perk: "Free oil change on next visit", action: "Leave a Google review within 48 hours of service" },
      { name: "Refer-a-Driver", perk: "$25 off next visit, $25 off their first", action: "Refer a friend who books a service" },
      { name: "Brake Job Reveal", perk: "Free tire rotation next visit", action: "Post a thank-you to your tech and tag the shop" },
      { name: "Restoration Showcase", perk: "Free detail at 6 months", action: "Post a reveal reel of your finished restoration project" },
      { name: "Family Fleet Plan", perk: "10% off services for the next 12 months", action: "Refer 3 family members who all bring their vehicles in" },
    ],
    differentiator: {
      intro: "Auto shop marketing usually means SEO and Google Ads — both expensive, both temporary. Social Perks builds an asset that compounds: a trusted reputation.",
      points: [
        { title: "Trust-driven, not coupon-driven", body: "Auto repair is a trust business. Our campaigns build trust by giving real customers a reason to vouch for you — instead of training new customers to chase discounts." },
        { title: "Tech and shop-respectful", body: "Your techs are the heart of the shop. We let them get credit for the work that earns referrals — building loyalty on both sides of the counter." },
        { title: "Built for long service cycles", body: "Oil changes every 5,000 miles. Brakes every 3 years. Our system keeps you in front of customers across long gaps without spamming them." },
      ],
    },
    testimonials: [
      { quote: "Our Google reviews went from 47 to 290 in six months. Calls from new customers tripled. I've been in business 22 years and never had a marketing channel work this well.", author: "Mike R.", business: "Mike's Honest Auto", location: "Phoenix, AZ", result: "Reviews 47 to 290, calls tripled" },
      { quote: "We compete with the dealership next door. They have a $40k/mo ad budget. We spend $49/mo on Social Perks and our bays are full first.", author: "Carlos T.", business: "Westside Auto Repair", location: "Austin, TX", result: "Beating dealership with $49/mo" },
      { quote: "The refer-a-driver program brought in 86 new customers in a year. Most of them are now regulars. Lifetime value of $2,400+ each.", author: "Sandra O.", business: "Empire Tire & Auto", location: "Denver, CO", result: "+86 referred customers in 12 months" },
    ],
    faqs: baseFAQs("Auto Shop", "Auto Shop"),
  },
  {
    slug: "pet-store-marketing-software",
    industry: "Pet Store",
    industryShort: "Pet Store",
    metaTitle: "Pet Store Marketing Software — Customers and Their Pets, Posting",
    metaDescription: "Pet store marketing platform for indie pet shops, groomers, and supply stores. Cute pets + Instagram = growth. Free trial.",
    heroPain: "Your customers love their pets. Their pets love your store. The internet loves pet content. Social Perks ties all three together — automatically.",
    heroSubhead: "The pet store marketing platform that turns every wagging tail and purring kitten into Instagram gold and foot traffic.",
    builtForSection: {
      intro: "Built for indie pet stores, groomers, doggy daycares, pet supply shops, and reptile/exotic specialists. We turn pet love into local traffic.",
      features: [
        { title: "Pet-of-the-week campaigns", description: "Customers post their pet shopping at your store, tag you, and enter for a free bag of premium food. Cute content goes viral, your store gets credit." },
        { title: "Groomer-spotlight reveals", description: "Post-groom photos drive bookings like nothing else. Owners who post the reveal and tag the groomer get $10 off the next appointment." },
        { title: "Adoption-event amplification", description: "Hosting an adoption event? Pre-event campaigns fill your store with pet lovers ready to spend on accessories, food, and toys for new family members." },
        { title: "Subscription-and-auto-ship perks", description: "Food and supply subscribers earn perks for posting their pet's monthly box opening. Your highest-margin recurring revenue grows fastest." },
      ],
    },
    campaigns: [
      { name: "Pet of the Week", perk: "Free bag of premium food", action: "Post your pet at the store and tag the shop" },
      { name: "Groom-Day Reveal", perk: "$10 off your next grooming appointment", action: "Post a photo of your post-groom pet and tag the groomer" },
      { name: "New Puppy Welcome", perk: "Free starter pack ($30 value)", action: "Post your new puppy's first store visit and tag the store" },
      { name: "Adoption Event Hero", perk: "20% off everything for the new pet", action: "Share the adoption event poster 72 hours before" },
      { name: "Subscription Unbox", perk: "Free toy in next month's box", action: "Post your monthly subscription unboxing with the store tagged" },
    ],
    differentiator: {
      intro: "Pet retail marketing software is usually just inventory tools. Social Perks gives you the missing piece — a steady stream of new pet parents through the door.",
      points: [
        { title: "Built for the emotional pet purchase", body: "Pets are family. Our campaigns respect that — celebrating relationships instead of pushing discount language." },
        { title: "Groomer-and-service friendly", body: "If you offer grooming or daycare, those services drive 5x the LTV of retail-only customers. Our system grows those bookings first." },
        { title: "Adoption-and-event ready", body: "Pet stores live on events — adoption days, holiday photos, training classes. Every event becomes a marketing engine in our platform." },
      ],
    },
    testimonials: [
      { quote: "Our adoption days used to bring 30 people. Last one brought 240. The pre-event campaign filled the parking lot and we sold out of starter packs.", author: "Bella R.", business: "Whiskers & Wags Co.", location: "Asheville, NC", result: "Adoption day attendance 8x'd" },
      { quote: "Grooming bookings doubled. Every reveal post brings new appointment requests within hours. I had to hire a second groomer.", author: "Tomas H.", business: "Furry Friends Pet Salon", location: "Portland, OR", result: "Grooming bookings 2x'd" },
      { quote: "I'm a 1,200 sq ft pet shop competing with PetSmart down the street. Social Perks is the reason I'm growing while they're shrinking.", author: "Linnea O.", business: "Paws & Claws Pet Supply", location: "Burlington, VT", result: "Growing while big-box shrinks" },
    ],
    faqs: baseFAQs("Pet Store", "Pet Store"),
  },
  {
    slug: "bookstore-marketing-software",
    industry: "Bookstore",
    industryShort: "Bookstore",
    metaTitle: "Bookstore Marketing Software — Build a Community Around Books",
    metaDescription: "Indie bookstore marketing platform that grows your reading community and competes with Amazon. Free 14-day trial.",
    heroPain: "Your bookstore is the heart of the neighborhood. Amazon doesn't know your customers' names — but they don't tell anyone you do. Social Perks changes that.",
    heroSubhead: "The bookstore marketing platform that turns every reader into a champion for your shop, your authors, and your community.",
    builtForSection: {
      intro: "Built for indie bookstores, used bookshops, specialty bookstores, and bookstore-cafes. We help you compete on the one thing Amazon can't: community.",
      features: [
        { title: "Staff-pick post campaigns", description: "Customers who buy a staff pick and post a photo (with the recommender tagged) earn $5 off their next book. Staff become local literary celebrities." },
        { title: "Book-club acceleration", description: "Active book clubs are pure retention gold. Members earn perks for posting club meetings and tagging the shop. Clubs grow, regular orders grow with them." },
        { title: "Author-event amplification", description: "Hosting an author? Pre-event campaigns fill seats and post-event campaigns sell signed books for weeks. Author-event attendance triples on average." },
        { title: "Subscription-box growth", description: "If you run a monthly book box, social posts of unboxings become your acquisition channel. Subscribers refer subscribers, all earning perks." },
      ],
    },
    campaigns: [
      { name: "Staff Pick Tag", perk: "$5 off your next book", action: "Post a photo of your staff-picked book and tag the recommender" },
      { name: "Book Club Spotlight", perk: "Free signed copy for the host", action: "Post a book club meeting at the store and tag the shop" },
      { name: "Author Event RSVP", perk: "Free coffee at the event", action: "Share the author event poster and bring a friend" },
      { name: "Reading Streak", perk: "$20 store credit for every 10 books posted", action: "Post a photo of each book you finish, tagging the store" },
      { name: "Subscription Unbox", perk: "Free bookmark + sticker pack monthly", action: "Post your monthly subscription unbox reveal" },
    ],
    differentiator: {
      intro: "Bookstore marketing software is usually inventory and POS. Social Perks builds the actual community that makes your bookstore irreplaceable.",
      points: [
        { title: "Built for the literary aesthetic", body: "Our QR cards, signage, and campaigns match the warm, curated feel of a bookshop. Nothing screams 'corporate marketing.'" },
        { title: "Author-and-event-aware", body: "Author events are your highest-leverage moments. Our system makes them go further by amplifying before, during, and after." },
        { title: "Staff visibility", body: "Booksellers are your secret weapon. Our system gives them spotlight through staff picks, becoming local micro-celebrities that customers seek out." },
      ],
    },
    testimonials: [
      { quote: "Author event attendance tripled. We hosted a debut novelist who'd never sold a book here and sold 87 signed copies in one night. The pre-event campaign filled the room.", author: "Hannah T.", business: "Page & Plume Books", location: "Portland, OR", result: "Author event attendance 3x'd" },
      { quote: "Our staff-pick program is now a real thing. Customers come in asking for 'whoever recommended this.' Our top bookseller has her own following.", author: "Ezra M.", business: "Field Notes Books", location: "Asheville, NC", result: "Bookseller-level personal followings" },
      { quote: "I've been an indie bookstore owner for 16 years. Social Perks is the first marketing tool that actually helps us compete with Amazon. Revenue up 22% this year.", author: "Marlene F.", business: "Wild Ivy Bookshop", location: "Burlington, VT", result: "Revenue +22% YoY" },
    ],
    faqs: baseFAQs("Bookstore", "Bookstore"),
  },
  {
    slug: "gift-shop-marketing-software",
    industry: "Gift Shop",
    industryShort: "Gift Shop",
    metaTitle: "Gift Shop Marketing Software — Turn Browsers Into Buyers",
    metaDescription: "Gift shop marketing platform for indie boutiques and specialty retailers. Drive traffic, fill carts, build loyalty. Free trial.",
    heroPain: "Your shop is a treasure hunt. The people who visit love it. The people who don't visit don't know it exists. Social Perks bridges that gap with the customers you already have.",
    heroSubhead: "The gift shop marketing platform that turns every cute display, holiday season, and gift purchase into Instagram-worthy content.",
    builtForSection: {
      intro: "Built for indie gift shops, stationery stores, candle shops, plant boutiques, and specialty retailers. We turn impulse-buy aesthetics into a marketing engine.",
      features: [
        { title: "Display-photo post campaigns", description: "Your curated displays are the whole pitch. Customers who post a display they love and tag the store get $5 off today's purchase. Foot traffic from social posts becomes constant." },
        { title: "Gift-recipient unboxing campaigns", description: "Gift recipients post the unboxing, tag the shop, and the original sender earns a perk for their next gift. Holiday seasons become content marathons." },
        { title: "Holiday-season acceleration", description: "Black Friday through Valentine's Day is 60% of your year. Our holiday campaigns drive foot traffic when it matters most — December conversion rates rival e-commerce." },
        { title: "Local-vendor amplification", description: "If you stock local makers, give them visibility. Customers who post a maker's product tag both the shop and the maker, earning a free local-made item." },
      ],
    },
    campaigns: [
      { name: "Display Discovery", perk: "$5 off today's purchase", action: "Post a photo of a display you love and tag the shop" },
      { name: "Gift Reveal", perk: "$10 credit for the sender's next gift", action: "Recipient posts the unboxing and tags the shop" },
      { name: "Holiday Hero", perk: "Free gift wrap for all season", action: "Share a holiday display photo with the shop tagged" },
      { name: "Local Maker Love", perk: "Free $15 local-made item", action: "Post a product photo tagging both the shop and the maker" },
      { name: "Stocking Stuffer Squad", perk: "20% off all stocking stuffers", action: "Bring 3 friends in for a stocking-stuffer shopping trip" },
    ],
    differentiator: {
      intro: "Gift shop marketing software usually means stale email blasts and Square loyalty programs. Social Perks builds the visual, social-first growth that gift shops actually need.",
      points: [
        { title: "Aesthetic-first design", body: "Every QR card, sign, and campaign template matches the curated feel of an indie gift shop. Nothing looks like big-box clearance." },
        { title: "Holiday-season optimized", body: "We know December is everything. Our system flexes for peak seasons, pushing more campaigns when conversion is highest." },
        { title: "Maker-and-vendor friendly", body: "If you support local makers, our system amplifies them too. Local-vendor tags grow both their followings and yours." },
      ],
    },
    testimonials: [
      { quote: "December revenue up 47% year-over-year. The display-discovery campaign brought new faces in every weekend. I've never had a holiday season like this.", author: "Marisol R.", business: "Honey & Hen", location: "Charleston, SC", result: "December revenue +47% YoY" },
      { quote: "Customers post our displays unprompted now. The shop went from 800 Instagram followers to 6,200 in eight months.", author: "Eleanor T.", business: "Petal House Goods", location: "Portland, OR", result: "+5,400 IG followers" },
      { quote: "The gift-recipient unboxing campaign is brilliant. Every Christmas gift becomes 2-3 social posts. Repeat business is the highest it's ever been.", author: "Joseph H.", business: "Field Day Mercantile", location: "Burlington, VT", result: "Repeat business at all-time high" },
    ],
    faqs: baseFAQs("Gift Shop", "Gift Shop"),
  },
  {
    slug: "photographer-marketing-software",
    industry: "Photographer",
    industryShort: "Photographer",
    metaTitle: "Photographer Marketing Software — Book Out Your Calendar",
    metaDescription: "Photographer marketing platform for portrait, wedding, family, and brand shoots. Turn galleries into client pipelines. Free trial.",
    heroPain: "Your work is incredible. Clients love their galleries. They post the photos — and crop out the watermark. Social Perks gives them a reason to tag you instead.",
    heroSubhead: "The photographer marketing platform that turns every gallery delivery into your next 5 client inquiries.",
    builtForSection: {
      intro: "Built for portrait photographers, wedding photographers, family photographers, brand and commercial shooters. We solve the credit-and-referral gap that costs you bookings.",
      features: [
        { title: "Gallery-delivery campaigns", description: "Every gallery comes with a perk: post 3 photos, tag the photographer, get a free print or 8x10. Tagged posts triple, bookings follow within weeks." },
        { title: "Wedding-portfolio engine", description: "Brides who post their wedding photos tagged with you in the first 30 days earn an anniversary mini-session. Every wedding becomes your next 5-10 inquiries." },
        { title: "Mini-session amplification", description: "Mini-session days fill or flop based on the marketing. Pre-event campaigns sell out spots in hours instead of weeks." },
        { title: "Family-session referral system", description: "Family clients who refer a friend's family session earn a free 16x20 print. Family work becomes self-sustaining via word-of-mouth." },
      ],
    },
    campaigns: [
      { name: "Gallery Reveal", perk: "Free 8x10 print", action: "Post 3 gallery photos with the photographer tagged" },
      { name: "Wedding Tagged Post", perk: "Free anniversary mini-session", action: "Bride posts wedding photos with photographer tagged in first 30 days" },
      { name: "Mini-Session Booking", perk: "Free print of your favorite", action: "Share the mini-session announcement 7 days before the event" },
      { name: "Family Referral", perk: "Free 16x20 print", action: "Refer a friend's family who books a full session" },
      { name: "Brand Shoot Tag", perk: "Free social-media-ready edit pack", action: "Brand client posts shoot images tagged on launch day" },
    ],
    differentiator: {
      intro: "Photographer marketing software is usually just gallery delivery and contracts. Social Perks adds the missing piece: a referral engine that turns every shoot into the next shoot.",
      points: [
        { title: "Built for the gallery moment", body: "The day a client gets their gallery is the most emotional moment in your relationship. We engineer the perk and post to land then — when intent and excitement peak." },
        { title: "Wedding-aware", body: "Weddings are your highest-LTV bookings. Each wedding's bridal-party network is 50-150 potential clients. We turn one wedding into your booked calendar." },
        { title: "Brand-and-commercial friendly", body: "Brand shoots multiply when the brand client posts. Our perks make tagging a no-brainer for them, growing your commercial-client portfolio." },
      ],
    },
    testimonials: [
      { quote: "I booked 14 weddings in two months from tagged Instagram posts. My calendar is closed through next September and I haven't run a paid ad in a year.", author: "Aria K.", business: "Aria K. Photography", location: "Charleston, SC", result: "+14 weddings booked in 60 days" },
      { quote: "Mini-session days used to take 3 weeks to fill. Now they sell out in 2 hours. The pre-event campaign is unbelievable.", author: "Daniel M.", business: "Westwind Family Photos", location: "Boulder, CO", result: "Mini-sessions sell out in 2 hours" },
      { quote: "Brand clients are tagging me now. I went from 2 commercial clients to 18 in a year. Each one books me for 3-4 shoots annually.", author: "Helena T.", business: "Bright Studio Co.", location: "Portland, OR", result: "Brand clients 2 to 18" },
    ],
    faqs: baseFAQs("Photographer", "Photographer"),
  },
  {
    slug: "massage-therapist-marketing-software",
    industry: "Massage Therapist",
    industryShort: "Massage Therapist",
    metaTitle: "Massage Therapist Marketing Software — Fill Your Schedule",
    metaDescription: "Massage therapy marketing platform for solo practitioners and studios. Build referrals, fill cancellations, retain clients. Free trial.",
    heroPain: "Word-of-mouth is your best channel. It's also slow and unpredictable. Social Perks accelerates it — turning every great session into the next 2-3 referrals.",
    heroSubhead: "The massage therapy marketing platform that fills your calendar through reviews, referrals, and the relationships you've already built.",
    builtForSection: {
      intro: "Built for solo massage therapists, small studios, sports massage practices, and spa-based therapists. We respect the calm, relational nature of your work.",
      features: [
        { title: "Post-session review automation", description: "A gentle SMS goes out the morning after the session: 'How are you feeling? An honest review earns a free aromatherapy upgrade next time.' Reviews build, calendar fills." },
        { title: "Referral perks for trusted clients", description: "Clients who refer a friend get $20 off their next session. The friend gets a discount on their first. Trust-based referrals replace paid ads entirely." },
        { title: "Cancellation-fill campaigns", description: "Last-minute cancellation? Push a flash perk to your client list. Open slots fill within hours instead of staying empty." },
        { title: "Package-and-membership growth", description: "Clients on packages or memberships are 5x more profitable than one-offs. Our system grows recurring revenue with perks for posting." },
      ],
    },
    campaigns: [
      { name: "Recovery Review", perk: "Free aromatherapy upgrade on next session", action: "Leave an honest review the morning after your session" },
      { name: "Refer a Friend in Need", perk: "$20 off your next session", action: "Refer a friend who books their first session" },
      { name: "Membership Spotlight", perk: "Free hot-stone upgrade", action: "Post a thank-you reel on your three-month membership" },
      { name: "Last-Minute Slot", perk: "20% off the surprise session", action: "Take a same-day cancellation slot offered via SMS" },
      { name: "Athlete Recovery Tag", perk: "Free sports-recovery add-on", action: "Sports client posts a recovery post with the practice tagged" },
    ],
    differentiator: {
      intro: "Massage therapy marketing software is usually just scheduling. Social Perks adds the layer that actually fills the schedule.",
      points: [
        { title: "Tone-aware messaging", body: "Massage clients value calm, relational communication. Our copy and timing respect that — gentle nudges, not aggressive sales." },
        { title: "Built for trust-based work", body: "Massage is intimate. Trust drives 100% of bookings. We build that trust through real client voices, not paid ads or pressure tactics." },
        { title: "Solo-practitioner friendly", body: "If you're a one-person practice, you don't have time to be a marketer. We automate the parts that matter so you can stay focused on the table." },
      ],
    },
    testimonials: [
      { quote: "I went from 60% booked to 95% booked in three months. The referral perks brought in 28 new clients from my existing client base. Game-changer.", author: "Priya H.", business: "Quiet Hands Massage", location: "Asheville, NC", result: "Calendar 60% to 95% booked" },
      { quote: "I'm a solo practitioner. Social Perks runs my marketing for me while I work. I literally don't think about it and my schedule stays full.", author: "Marcus L.", business: "Deep Tissue Co.", location: "Austin, TX", result: "Hands-off, fully-booked schedule" },
      { quote: "Membership clients used to be 12% of revenue. After the membership-spotlight campaign, they're 41% — and they pay monthly whether they book or not.", author: "Helena O.", business: "Stillpoint Bodywork", location: "Portland, OR", result: "Membership revenue 12% to 41%" },
    ],
    faqs: baseFAQs("Massage Therapist", "Massage Therapist"),
  },
];

export const INDUSTRY_PAGE_MAP = new Map(
  INDUSTRY_PAGES.map((page) => [page.slug, page]),
);

export const INDUSTRY_PAGE_SLUGS = INDUSTRY_PAGES.map((p) => p.slug);
