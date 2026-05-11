export type BestForItem = {
  slug: string;
  criteria: string;
  title: string;
  heroSubhead: string;
  needs: { label: string; detail: string }[];
  whySocialPerks: { headline: string; detail: string }[];
  workflow: string[];
  pricingTier: { tier: string; price: string; why: string };
  alternativesToCheck: { slug: string; label: string }[];
};

export const BEST_FOR: BestForItem[] = [
  {
    slug: "small-business-with-no-budget",
    criteria: "Small Business With No Budget",
    title: "Best Customer Marketing Platform for Small Businesses With No Budget",
    heroSubhead:
      "When every dollar matters, Social Perks lets you turn existing customers into your marketing team for less than a typical phone bill.",
    needs: [
      { label: "Free or near-free entry point", detail: "Cannot justify hundreds of dollars per month before any revenue lift is proven." },
      { label: "Zero technical setup", detail: "No website redesign, no developer hours, no integrations consultant." },
      { label: "Replaces paid ads, not supplements them", detail: "Should reduce or eliminate paid ad spend, not add to total marketing cost." },
      { label: "Measurable in 30 days", detail: "Need to see real revenue impact within one month or it gets cut." },
      { label: "Works with whatever you already use", detail: "Has to fit into existing point-of-sale, Instagram, Google Business Profile." },
    ],
    whySocialPerks: [
      { headline: "Free 14-day trial with no card required", detail: "Test the entire platform on real customers before committing a dollar." },
      { headline: "Starter tier at $49/month", detail: "Less than one paid Facebook ad campaign per month and produces compounding word-of-mouth." },
      { headline: "Setup takes 15 minutes", detail: "Connect Google Business Profile, define one perk, share the QR code. Done." },
      { headline: "No-budget friendly perks", detail: "Reward customers with free product, status, and feature shouts instead of cash." },
      { headline: "ROI in week one for most users", detail: "Average no-budget user sees 5-15 new reviews and 3-8 referrals in the first 30 days." },
    ],
    workflow: [
      "Sign up for the free trial and complete the 5-step onboarding (under 15 minutes).",
      "Pick a single perk customers can earn (e.g., free menu item after 3 social shares, or 10% off next visit for a review).",
      "Print the QR code and put it at the checkout counter.",
      "Mention the perk to every customer at point-of-sale for the first 2 weeks.",
      "Approve customer submissions in the dashboard. Reviews, posts, and referrals start flowing.",
      "After 30 days, look at the dashboard. Most users have 5-15 new reviews and 3-8 referred customers.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "The Starter tier covers everything a no-budget small business needs: one perk program, unlimited customer enrollments, review automation, and referral tracking. There's no per-customer fee and no contract.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (which starts at $500/month)" },
      { slug: "smile-io", label: "vs. Smile.io (loyalty-only, no review system)" },
      { slug: "manual-referral-tracking", label: "vs. Manual referral tracking (spreadsheets and goodwill)" },
    ],
  },
  {
    slug: "restaurant-owners",
    criteria: "Restaurant Owners",
    title: "Best Customer Marketing Platform for Restaurant Owners",
    heroSubhead:
      "Restaurants live and die by reviews, repeat visits, and word of mouth. Social Perks turns happy diners into a continuous flow of reviews, Instagram posts, and friend referrals.",
    needs: [
      { label: "Drive repeat visits", detail: "Every restaurant's biggest profit lever is turning first-time diners into regulars." },
      { label: "Increase review volume on Google and Yelp", detail: "Local SEO ranking depends almost entirely on review velocity and rating." },
      { label: "Generate Instagram content from customers", detail: "Food photography by happy customers outperforms staged shots 4-7x." },
      { label: "Fit into the chaos of service", detail: "Front-of-house staff have no time for complicated tech during a rush." },
      { label: "Work for both dine-in and takeout", detail: "Same program needs to capture both channels." },
    ],
    whySocialPerks: [
      { headline: "QR code on every table and to-go bag", detail: "Customers scan, see their perk options, and act in 10 seconds." },
      { headline: "Auto-prompts reviews at peak satisfaction", detail: "The single highest-converting moment is just after the meal. We catch it." },
      { headline: "UGC pipeline built in", detail: "Diners tag your restaurant for a free dessert, side, or drink. You get rights-cleared content forever." },
      { headline: "Tracks repeat-visit perks", detail: "Easy 'every 5th visit free' programs without a punch card system." },
      { headline: "Integrates with Toast, Square, and Clover", detail: "Pull purchase data automatically to power smarter perks." },
    ],
    workflow: [
      "Print Social Perks QR codes for each table and on every takeout bag.",
      "Set up three perks: 1) free side for a Google review, 2) free dessert for an Instagram tag, 3) 5th visit free.",
      "Train servers to mention the QR at the end of every meal.",
      "Approve submissions throughout each service.",
      "Every Monday, review the week's results: new reviews, IG tags, repeat visits.",
      "Refine perks based on what's working. Most restaurants see review volume double in 60 days.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Most independent restaurants land on the Growth tier — it includes POS integrations (Toast, Square, Clover), unlimited submissions, and multi-perk programs needed to run reviews, UGC, and loyalty simultaneously.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (built for e-commerce, not restaurants)" },
      { slug: "fivestars", label: "vs. Fivestars (loyalty-only, no review or UGC system)" },
      { slug: "manual-instagram-marketing", label: "vs. Hiring an Instagram manager ($1,500-$3,000/month)" },
    ],
  },
  {
    slug: "coffee-shop-owners",
    criteria: "Coffee Shop Owners",
    title: "Best Customer Marketing Platform for Coffee Shop Owners",
    heroSubhead:
      "Independent coffee shops thrive on community, regulars, and Instagram aesthetic. Social Perks builds all three on a budget that fits a $5 latte business.",
    needs: [
      { label: "Build a community of regulars", detail: "70% of revenue comes from 30% of customers — make those customers feel special." },
      { label: "Beautiful customer content", detail: "Latte art and cafe shots are perfect for Instagram if you can get customers to post them." },
      { label: "Low-tech friendly", detail: "Owner-operated cafes don't have time for complicated dashboards." },
      { label: "Affordable", detail: "Coffee shops run on thin margins — every monthly expense matters." },
      { label: "Drive morning traffic", detail: "Mornings make the business; smart perks can drive a 15-25% lift in AM traffic." },
    ],
    whySocialPerks: [
      { headline: "Free drink rewards drive repeat visits", detail: "A free 12th drink program lifts visit frequency 30-50%." },
      { headline: "Customers love sharing latte art", detail: "Reward Instagram tags with a free pastry and watch UGC explode." },
      { headline: "5-minute setup", detail: "Define one perk, print a counter card, you're live." },
      { headline: "Starter tier is built for cafes", detail: "$49/month covers everything a small coffee shop needs." },
      { headline: "Square POS integration", detail: "If you use Square, perks automatically apply at checkout." },
    ],
    workflow: [
      "Pick three perks: 12th drink free, Instagram tag = free pastry, Google review = free upgrade to large.",
      "Print a counter card with the QR code and three perks listed.",
      "Train baristas to mention the program at point-of-sale during slow moments.",
      "Approve customer submissions from your phone between rushes.",
      "Watch Instagram tags compound — most cafes see 30-60 new tags in the first month.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "A small independent coffee shop fits the Starter tier perfectly: one or two perks, Square POS integration available, and review automation. Most cafes never need to upgrade.",
    },
    alternativesToCheck: [
      { slug: "punchh", label: "vs. Punchh (enterprise pricing, way too much for one cafe)" },
      { slug: "paper-punch-cards", label: "vs. Paper punch cards (which customers lose every week)" },
      { slug: "diy-instagram-strategy", label: "vs. DIY Instagram strategy (which takes 10 hours/week)" },
    ],
  },
  {
    slug: "yoga-studios",
    criteria: "Yoga Studios",
    title: "Best Customer Marketing Platform for Yoga Studios",
    heroSubhead:
      "Yoga studios run on community, retention, and word of mouth. Social Perks turns your most loyal members into a continuous stream of new students and Instagram content.",
    needs: [
      { label: "Increase member retention", detail: "Studio profit depends on members staying for 6+ months, not just one trial month." },
      { label: "Drive new member referrals", detail: "Most new members come from a friend's recommendation — formalize this." },
      { label: "Capture aesthetic UGC", detail: "Yoga poses, studio shots, and community moments are content gold for Instagram." },
      { label: "Reward attendance, not just spending", detail: "Class attendance is the leading indicator of retention." },
      { label: "Integrate with MindBody or similar", detail: "Studio software already handles classes; the marketing platform needs to plug in." },
    ],
    whySocialPerks: [
      { headline: "Attendance-based perks", detail: "Reward members for attending 10, 25, 50 classes — not just for spending money." },
      { headline: "Bring-a-friend programs", detail: "Existing member gets a free workshop; friend gets a free trial week. Easy double-sided incentive." },
      { headline: "Yoga-friendly UGC pipeline", detail: "Reward Instagram tags during sunrise classes or special events." },
      { headline: "MindBody integration", detail: "Pull attendance data automatically to power retention perks." },
      { headline: "Community-first design", detail: "Built around recognition, not just discounts — fits yoga's ethos perfectly." },
    ],
    workflow: [
      "Connect your studio software (MindBody, Pike13, etc.).",
      "Set up three perks: attendance milestones (free class at 10 attendances), referral rewards (member + friend), and Instagram tag perks.",
      "Announce the program in one in-person class and one email.",
      "Members enroll via QR code at the front desk.",
      "Watch retention and referral rates climb over 90 days. Most studios see a 20-30% lift in 90-day member retention.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Most yoga studios land on Growth: studio-software integrations, multi-perk programs, and unlimited member enrollments. The math: one retained member at $150/month covers the platform on day one.",
    },
    alternativesToCheck: [
      { slug: "smile-io", label: "vs. Smile.io (built for e-commerce, doesn't track class attendance)" },
      { slug: "perkville", label: "vs. Perkville (similar tool, less flexible perk types)" },
      { slug: "no-loyalty-program", label: "vs. No program (silent member churn)" },
    ],
  },
  {
    slug: "salon-owners",
    criteria: "Salon Owners",
    title: "Best Customer Marketing Platform for Salon Owners",
    heroSubhead:
      "Salons are visual businesses where customer transformations are your best marketing. Social Perks turns every great cut, color, and style into reviews, before-and-afters, and referrals.",
    needs: [
      { label: "Drive customer referrals", detail: "Personal recommendations are how 60% of new salon clients find their stylist." },
      { label: "Generate before-and-after UGC", detail: "Transformation photos and videos are the highest-converting salon content." },
      { label: "Reward client loyalty per stylist", detail: "Clients are loyal to a specific stylist, not just the salon brand." },
      { label: "Increase appointment frequency", detail: "Move clients from 8-week to 6-week visit cycles for a 33% revenue lift." },
      { label: "Capture Google reviews", detail: "Local salon SEO depends almost entirely on review velocity and rating." },
    ],
    whySocialPerks: [
      { headline: "Stylist-level tracking", detail: "Assign perks and referrals to the specific stylist so they earn the credit." },
      { headline: "Photo-friendly UGC pipeline", detail: "Reward before-and-after shots with discounts on the next service." },
      { headline: "Rebooking nudges", detail: "Auto-prompts clients to rebook with their stylist before they walk out the door." },
      { headline: "Integrates with Square Appointments, Booksy, and Vagaro", detail: "Pull appointment data to power retention perks." },
      { headline: "Friend-referral programs", detail: "Existing client gets $20 off; friend gets $20 off their first visit." },
    ],
    workflow: [
      "Connect your booking software.",
      "Set up three perks: rebook within 6 weeks for $10 off, referral = $20 for both parties, Instagram tag = free upgrade.",
      "Train every stylist to mention the program at checkout.",
      "Print station cards with the QR code at every chair.",
      "Track per-stylist performance in the dashboard. Top stylists become referral magnets in 30-60 days.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Most salons need the Growth tier for booking-software integration and per-stylist tracking. One retained client cycle covers the platform monthly.",
    },
    alternativesToCheck: [
      { slug: "fivestars", label: "vs. Fivestars (loyalty-only, no UGC or per-stylist tracking)" },
      { slug: "boulevard", label: "vs. Boulevard add-ons (more expensive, less flexible)" },
      { slug: "manual-referral-cards", label: "vs. Manual referral cards (broken tracking, lost cards)" },
    ],
  },
  {
    slug: "gym-owners",
    criteria: "Gym Owners",
    title: "Best Customer Marketing Platform for Gym Owners",
    heroSubhead:
      "Gyms compete on community and results. Social Perks lets you turn member transformations and milestones into a constant flow of social proof and friend referrals.",
    needs: [
      { label: "Lower member churn", detail: "Average gym churn is 30-40% annually — every retention point matters." },
      { label: "Drive transformation UGC", detail: "Before-and-after photos are the most persuasive gym marketing content." },
      { label: "Reward attendance, not just payment", detail: "Members who attend 3+ times per week retain at 5x the rate of inactive members." },
      { label: "Generate friend referrals", detail: "Members who train with friends retain 2x longer." },
      { label: "Integrate with gym management software", detail: "Mindbody, Zen Planner, Wodify already handle scheduling." },
    ],
    whySocialPerks: [
      { headline: "Attendance-based perks", detail: "Members earn rewards for showing up, not just for paying dues." },
      { headline: "Transformation-share rewards", detail: "Member shares a 30-day progress photo and gets a free month of supplements or a t-shirt." },
      { headline: "Bring-a-buddy programs", detail: "Existing member gets a personal training session free; friend gets two-week trial." },
      { headline: "Integrates with Mindbody, Zen Planner, Wodify", detail: "Pull attendance data to auto-trigger perks." },
      { headline: "Per-coach attribution", detail: "Track which trainers generate the most referrals so you can reward and amplify them." },
    ],
    workflow: [
      "Connect your gym software.",
      "Set up perks: 20-class attendance milestone, transformation post = free month of supplements, friend referral = both get one PT session.",
      "Announce the program in a class, on Instagram, and via email.",
      "Members enroll at the front desk via QR code.",
      "Watch attendance and referrals climb. Most gyms see a 15-25% reduction in 90-day churn.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Gyms need the Growth tier for gym-software integration and per-coach tracking. One retained member at $99/month covers the platform within the first week of every billing cycle.",
    },
    alternativesToCheck: [
      { slug: "perkville", label: "vs. Perkville (loyalty-only, no UGC)" },
      { slug: "diy-member-marketing", label: "vs. DIY member marketing (one staffer running spreadsheets)" },
      { slug: "no-retention-program", label: "vs. No retention program (silent churn)" },
    ],
  },
  {
    slug: "boutique-owners",
    criteria: "Boutique Owners",
    title: "Best Customer Marketing Platform for Boutique Owners",
    heroSubhead:
      "Boutiques win when customers wear, share, and recommend. Social Perks turns every outfit into Instagram content and every happy customer into a sales channel.",
    needs: [
      { label: "Generate outfit-of-the-day UGC", detail: "Customer styling photos convert at 4-7x the rate of brand-shot product photos." },
      { label: "Drive repeat customers", detail: "60% of boutique revenue comes from repeat customers in their second year." },
      { label: "Build a VIP community", detail: "Loyal customers want early access, exclusive drops, and special events." },
      { label: "Integrate with Shopify or Square", detail: "Most boutiques already run on one or both." },
      { label: "Affordable for small inventory businesses", detail: "Boutique margins are tight; software cost matters." },
    ],
    whySocialPerks: [
      { headline: "OOTD reward programs", detail: "Customer posts an outfit and tags the boutique → gets a discount on the next purchase." },
      { headline: "VIP tiers based on annual spend", detail: "Top customers unlock early access, private shopping nights, and exclusive perks." },
      { headline: "Shopify and Square integration", detail: "Pull purchase data to auto-trigger perks at the right tier." },
      { headline: "Friend-referral programs", detail: "Existing customer gets $20 off; friend gets $20 off their first purchase." },
      { headline: "Event RSVPs and special drops", detail: "Reserve hot inventory for the most loyal customers." },
    ],
    workflow: [
      "Connect Shopify or Square.",
      "Set up perks: OOTD tag = 15% off next purchase, $500 annual spend = VIP tier, friend referral = $20 for both parties.",
      "Promote the program in-store with QR cards and on Instagram in the bio.",
      "Approve OOTD submissions throughout the week.",
      "Build a rights-cleared content library while driving repeat visits. Most boutiques see a 25-40% lift in repeat purchase rate.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Boutiques need the Growth tier for Shopify/Square integration and VIP tier programs. One repeat customer per week covers the platform.",
    },
    alternativesToCheck: [
      { slug: "smile-io", label: "vs. Smile.io (loyalty points only, no UGC pipeline)" },
      { slug: "yotpo", label: "vs. Yotpo (enterprise pricing, overkill for one boutique)" },
      { slug: "no-loyalty-program", label: "vs. No program (lost repeat customers)" },
    ],
  },
  {
    slug: "e-commerce-stores",
    criteria: "E-commerce Stores",
    title: "Best Customer Marketing Platform for E-commerce Stores",
    heroSubhead:
      "E-commerce lives or dies by repeat purchase rate, UGC, and reviews. Social Perks builds all three with a Shopify-native flow that activates the day you install it.",
    needs: [
      { label: "Lift repeat purchase rate", detail: "Going from 20% to 30% repeat rate often doubles overall profit." },
      { label: "Generate product UGC at scale", detail: "Customer photos on product pages lift conversion 20-40%." },
      { label: "Increase review volume", detail: "Reviews drive conversion, search ranking, and ad performance simultaneously." },
      { label: "Drive friend referrals post-purchase", detail: "Best moment to ask is right after a great unboxing experience." },
      { label: "Shopify integration", detail: "Has to integrate cleanly with the existing checkout and customer flow." },
    ],
    whySocialPerks: [
      { headline: "Shopify-native installation", detail: "One-click install, auto-pulls product catalog and customer data." },
      { headline: "Post-purchase perks", detail: "Trigger review and UGC perks 7 days after delivery — the peak satisfaction window." },
      { headline: "Refer-a-friend built into checkout", detail: "Auto-prompt referrals at the order-confirmation page." },
      { headline: "Tier-based loyalty programs", detail: "Annual spenders unlock VIP perks; first-time buyers get welcome bundles." },
      { headline: "UGC rights-management built in", detail: "Every submission includes a license to use the content in ads and on product pages." },
    ],
    workflow: [
      "Install the Shopify app (one click).",
      "Set up three perks: review = 10% off next order, UGC tag = $20 credit, referral = $25 for both parties.",
      "Enable post-purchase email and order-confirmation banner.",
      "Let the program run for 30 days untouched.",
      "Review dashboard: most stores see a 15-30% lift in repeat purchase rate and 100+ new UGC submissions in the first 60 days.",
    ],
    pricingTier: {
      tier: "Growth or Premium",
      price: "$149-$299/month",
      why: "Most stores doing $30K-$200K/month land on Growth. Stores doing $200K+/month upgrade to Premium for unlimited UGC submissions, advanced segmentation, and dedicated success manager.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (more expensive, less referral focus)" },
      { slug: "smile-io", label: "vs. Smile.io (no UGC or referral pipeline)" },
      { slug: "loox", label: "vs. Loox (review-only, no loyalty or referrals)" },
    ],
  },
  {
    slug: "service-businesses",
    criteria: "Service Businesses",
    title: "Best Customer Marketing Platform for Service Businesses",
    heroSubhead:
      "Cleaners, plumbers, landscapers, dog walkers — service businesses run on trust and referrals. Social Perks systematizes the word-of-mouth flywheel.",
    needs: [
      { label: "Drive customer referrals", detail: "80% of service-business growth comes from referrals — formalize this engine." },
      { label: "Increase Google review volume", detail: "Local SEO ranking depends almost entirely on review velocity and rating." },
      { label: "Build before-and-after UGC", detail: "Transformation photos (clean → spotless, dead lawn → lush) are persuasive marketing." },
      { label: "Work without retail tech", detail: "No POS, no foot traffic, no checkout system to integrate with." },
      { label: "Reward repeat customers", detail: "Repeat service customers are 5-10x more profitable than new ones." },
    ],
    whySocialPerks: [
      { headline: "Job-based perks", detail: "Trigger review and referral asks after a completed job, not at a POS." },
      { headline: "Before-and-after pipeline", detail: "Customers submit photos of the result for a discount on next service." },
      { headline: "Generous referral rewards", detail: "Service businesses can afford bigger rewards — Social Perks supports cash, credit, or perk-based options." },
      { headline: "SMS-first workflow", detail: "Most service customers prefer SMS to email — built-in for review and referral asks." },
      { headline: "No retail tech required", detail: "Works for any business; no POS integration needed." },
    ],
    workflow: [
      "Sign up and create your service-business profile.",
      "Set up perks: Google review after job = $20 credit, before-and-after submission = $25 credit, friend referral = $50 for both parties.",
      "Trigger an SMS to each customer 24 hours after a completed job.",
      "Approve submissions and track per-tech performance.",
      "Within 60 days, most service businesses double review volume and see 3-8 referrals per month.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Service businesses fit the Growth tier: SMS triggers, unlimited customers, and per-technician attribution. One additional booking per month covers the platform.",
    },
    alternativesToCheck: [
      { slug: "nicejob", label: "vs. NiceJob (review-only, no referral or UGC system)" },
      { slug: "podium", label: "vs. Podium (more expensive, less customer marketing depth)" },
      { slug: "manual-referral-tracking", label: "vs. Manual referral tracking (spreadsheets that break at scale)" },
    ],
  },
  {
    slug: "food-trucks",
    criteria: "Food Trucks",
    title: "Best Customer Marketing Platform for Food Trucks",
    heroSubhead:
      "Food trucks compete on visibility, social media, and loyal locals who hunt down your next location. Social Perks turns every meal into a social post and every regular into a tracker.",
    needs: [
      { label: "Build a social following that follows the truck", detail: "Customers need to know where you'll be next." },
      { label: "Generate Instagram tags and stories", detail: "Food trucks live on visual social media." },
      { label: "Reward locals who travel to find you", detail: "Top customers track your location and deserve recognition." },
      { label: "Affordable for a small operation", detail: "Food trucks have tight margins." },
      { label: "Mobile-first dashboard", detail: "Owner is in the truck, not at a desk." },
    ],
    whySocialPerks: [
      { headline: "Instagram tag perks", detail: "Customer tags the truck in a meal photo → gets a free side at the next visit." },
      { headline: "Location-tracker rewards", detail: "Reward customers who visit you at 3+ different locations." },
      { headline: "Mobile-first dashboard", detail: "Approve submissions from your phone between rushes." },
      { headline: "Square integration", detail: "If you use Square, perks apply automatically at checkout." },
      { headline: "Starter tier built for solo operations", detail: "$49/month covers everything a food truck needs." },
    ],
    workflow: [
      "Sign up and connect Square if you use it.",
      "Set up two perks: Instagram tag = free side, 5th visit = free entree.",
      "Print a window decal with the QR code and program details.",
      "Mention the program when handing over each order.",
      "Approve submissions from your phone. Most trucks see 30-60 new tags in the first month.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "Food trucks fit perfectly into Starter: simple perks, mobile dashboard, Square integration. Most never need to upgrade.",
    },
    alternativesToCheck: [
      { slug: "fivestars", label: "vs. Fivestars (no UGC focus, no mobile-friendly dashboard)" },
      { slug: "diy-instagram-strategy", label: "vs. DIY Instagram strategy (time you don't have)" },
      { slug: "no-loyalty-program", label: "vs. No program (silent customer loss)" },
    ],
  },
  {
    slug: "multi-location-businesses",
    criteria: "Multi-Location Businesses",
    title: "Best Customer Marketing Platform for Multi-Location Businesses",
    heroSubhead:
      "Running 3, 10, or 50 locations means consistent brand standards, location-specific data, and centralized control. Social Perks gives you all three without an enterprise contract.",
    needs: [
      { label: "Centralized perk management", detail: "Set programs at HQ and roll out to all locations consistently." },
      { label: "Location-specific reporting", detail: "Compare review volume, referrals, and UGC per location." },
      { label: "Manager-level access", detail: "Each location manager sees their own data without HQ access." },
      { label: "Brand compliance", detail: "Locations can customize perks but not the brand voice or visual identity." },
      { label: "Multi-POS support", detail: "Different locations may use different systems." },
    ],
    whySocialPerks: [
      { headline: "Multi-location dashboard", detail: "Roll up all locations into one HQ view, drill down to individual stores." },
      { headline: "Role-based access", detail: "HQ, regional, and location managers each see what they need." },
      { headline: "Centralized perk templates", detail: "Build once at HQ, roll out everywhere." },
      { headline: "Per-location leaderboards", detail: "Friendly competition between locations drives 20-40% lift in engagement." },
      { headline: "Multi-POS integration", detail: "Toast, Square, Shopify, and 20+ other integrations all in one platform." },
    ],
    workflow: [
      "Sign up at the Premium tier and onboard HQ administrators.",
      "Build perk templates centrally.",
      "Roll out to each location with location-specific QR codes.",
      "Train regional managers on the dashboard.",
      "Review monthly: which locations lead, which lag. Coach the laggards using the playbook.",
      "Multi-location businesses typically see 15-25% lift in same-store sales within 6 months.",
    ],
    pricingTier: {
      tier: "Premium",
      price: "$299/month + per-location pricing",
      why: "Multi-location businesses need the Premium tier for centralized management, role-based access, and dedicated success management. Per-location pricing scales with the business.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (enterprise but designed for single-brand e-commerce)" },
      { slug: "punchh", label: "vs. Punchh (restaurant-specific, less flexible)" },
      { slug: "diy-multi-location", label: "vs. Spreadsheet-based multi-location tracking (breaks at 5+ stores)" },
    ],
  },
  {
    slug: "new-businesses",
    criteria: "New Businesses",
    title: "Best Customer Marketing Platform for New Businesses",
    heroSubhead:
      "Your first 100 customers are your most important. Social Perks turns them into a marketing team that delivers reviews, social posts, and referrals before you can afford paid ads.",
    needs: [
      { label: "Get the first 50 reviews fast", detail: "A business with 50+ Google reviews looks established; under 10 looks risky." },
      { label: "Drive early word-of-mouth", detail: "Referrals from the first happy customers compound into a community." },
      { label: "Generate launch UGC", detail: "Real customer content is more persuasive than any agency-produced campaign." },
      { label: "Affordable while pre-revenue", detail: "New businesses need to keep monthly burn low." },
      { label: "Quick setup", detail: "Owner is wearing 10 hats and has no time for a 6-week onboarding." },
    ],
    whySocialPerks: [
      { headline: "Free 14-day trial", detail: "Validate the program with your first customers before paying anything." },
      { headline: "Setup in 15 minutes", detail: "Simple onboarding designed for solo owners." },
      { headline: "Starter tier at $49/month", detail: "Less than one shift of part-time staff." },
      { headline: "Launch playbook included", detail: "Step-by-step guide for the first 30 days." },
      { headline: "Built-in templates for new businesses", detail: "Pre-built perks for restaurants, retail, services, fitness." },
    ],
    workflow: [
      "Sign up during your trial and complete onboarding (under 15 minutes).",
      "Pick one perk: 'Be one of our first 50 reviewers and get a free [product/service]'.",
      "Mention it to every customer in your first 60 days.",
      "Approve reviews and UGC as they come in.",
      "By day 90, most new businesses have 50-100 reviews, 30-60 UGC posts, and 5-15 referred customers.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "New businesses almost always start on Starter. Upgrade to Growth once you have 200+ customers and need POS integration.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (overkill and overpriced for a new business)" },
      { slug: "no-marketing-system", label: "vs. No system (relying on luck and Instagram)" },
      { slug: "paid-ads-only", label: "vs. Paid ads only (expensive and stops the moment you stop spending)" },
    ],
  },
  {
    slug: "established-businesses",
    criteria: "Established Businesses",
    title: "Best Customer Marketing Platform for Established Businesses",
    heroSubhead:
      "10+ years in business means you have a customer base, brand recognition, and existing systems. Social Perks plugs into all of it and unlocks the dormant marketing power of your customer relationships.",
    needs: [
      { label: "Re-engage lapsed customers", detail: "Established businesses have huge dormant customer bases — wake them up." },
      { label: "Move from punch cards to digital loyalty", detail: "Modern customers expect a digital experience." },
      { label: "Integrate with existing systems", detail: "POS, email, accounting — has to plug in without disruption." },
      { label: "Generate fresh content from real customers", detail: "Replace old branded content with constant new UGC." },
      { label: "Drive same-store sales growth", detail: "Established businesses need a 5-15% same-store lift annually." },
    ],
    whySocialPerks: [
      { headline: "Customer-list import", detail: "Bring in your existing customer database and re-engage with welcome perks." },
      { headline: "Lapsed-customer winback", detail: "Auto-trigger perks for customers who haven't visited in 60+ days." },
      { headline: "Integrates with everything", detail: "Toast, Square, Shopify, MindBody, and 20+ other systems." },
      { headline: "Replace paper punch cards", detail: "Migrate to digital loyalty in a single weekend." },
      { headline: "Mature reporting", detail: "Track cohort retention, per-channel performance, and same-store lift." },
    ],
    workflow: [
      "Import your existing customer list and email database.",
      "Run a welcome-back campaign with a generous perk for re-engagement.",
      "Set up an ongoing review, UGC, and referral program.",
      "Connect your POS to auto-trigger perks at the right moments.",
      "Review same-store lift quarterly. Established businesses typically see a 5-15% lift in year one.",
    ],
    pricingTier: {
      tier: "Growth or Premium",
      price: "$149-$299/month",
      why: "Established businesses doing $500K-$3M/year fit Growth; those above $3M typically upgrade to Premium for advanced analytics and dedicated support.",
    },
    alternativesToCheck: [
      { slug: "legacy-loyalty-vendors", label: "vs. Legacy loyalty vendors (slow to update, expensive)" },
      { slug: "yotpo", label: "vs. Yotpo (e-commerce-focused, not for brick-and-mortar)" },
      { slug: "do-nothing", label: "vs. Doing nothing (slow erosion of customer base)" },
    ],
  },
  {
    slug: "creators-and-influencers",
    criteria: "Creators and Influencers",
    title: "Best Customer Marketing Platform for Creators and Influencers",
    heroSubhead:
      "Creators don't have customers — they have communities. Social Perks lets you reward your top fans, manage brand deals, and turn your audience into a content engine.",
    needs: [
      { label: "Reward top fans", detail: "Your most engaged 5% drive 60% of growth — recognize them." },
      { label: "Manage brand collaborations", detail: "Track every deal, deliverable, and disclosure in one place." },
      { label: "Generate fan UGC", detail: "Fans creating content about you compounds your reach 10x." },
      { label: "Affiliate revenue tracking", detail: "Track every affiliate sale across multiple brand partnerships." },
      { label: "Audience analytics", detail: "Understand which fans drive the most engagement and which brands convert best." },
    ],
    whySocialPerks: [
      { headline: "Fan-tier programs", detail: "Reward top fans with exclusive access, merch, and personal shoutouts." },
      { headline: "Brand deal management", detail: "Manage every campaign, deliverable, contract, and payment in one dashboard." },
      { headline: "Affiliate tracking", detail: "Per-brand affiliate links with real-time conversion data." },
      { headline: "Creator-friendly pricing", detail: "Starter tier at $49/month — less than one sponsored post." },
      { headline: "FTC compliance built-in", detail: "Auto-generated disclosure language for every paid post." },
    ],
    workflow: [
      "Sign up as a creator and connect your social accounts.",
      "Set up fan tiers (e.g., based on engagement or paid membership).",
      "Connect brand-deal partners through the platform.",
      "Track every campaign, payment, and audience response.",
      "Most creators see a 30-50% lift in fan engagement within 90 days.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "Most creators fit Starter for fan engagement and basic brand deal tracking. Upgrade to Growth when you're managing 5+ brand deals per month.",
    },
    alternativesToCheck: [
      { slug: "patreon", label: "vs. Patreon (subscription-only, no brand deals or UGC)" },
      { slug: "manual-brand-deal-tracking", label: "vs. Manual brand deal tracking (spreadsheets and Notion docs)" },
      { slug: "no-fan-program", label: "vs. No fan program (fans drift to other creators)" },
    ],
  },
  {
    slug: "non-tech-people",
    criteria: "Non-Tech People",
    title: "Best Customer Marketing Platform for Non-Tech People",
    heroSubhead:
      "If you've never set up software in your life, Social Perks is built for you. Setup is 5 steps, in plain English, with phone support included.",
    needs: [
      { label: "Onboarding that doesn't require a tutorial video", detail: "Plain English, step-by-step, with examples." },
      { label: "Live support from a real human", detail: "When stuck, talking to someone fast matters more than a help-center article." },
      { label: "No code, no integrations to fight with", detail: "Should work out of the box without any technical setup." },
      { label: "Plain-English dashboards", detail: "No jargon, no graphs that need a data analyst to interpret." },
      { label: "Templates for everything", detail: "Pre-built perks, email templates, and printables." },
    ],
    whySocialPerks: [
      { headline: "5-step onboarding wizard", detail: "Each step has plain-English instructions and a screenshot example." },
      { headline: "Phone and chat support", detail: "Real humans, not bots, available during business hours." },
      { headline: "No technical integrations required", detail: "QR code-based system works without connecting anything." },
      { headline: "Plain-English dashboard", detail: "'You got 7 new reviews this week' instead of 'NPS delta +12.4'." },
      { headline: "Library of templates", detail: "Pre-built perks, email copy, in-store signage, and social posts." },
    ],
    workflow: [
      "Sign up and click through the 5-step onboarding (under 15 minutes).",
      "Choose a pre-built perk template that fits your business.",
      "Print the included QR code signage and put it where customers see it.",
      "Open the dashboard once a day and approve new submissions.",
      "If stuck, call or chat with support — average response time is under 4 minutes.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "Non-tech users fit Starter perfectly: simple feature set, generous support included, no integrations required.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (steep learning curve, designed for tech-savvy users)" },
      { slug: "diy-marketing", label: "vs. DIY marketing in spreadsheets (frustrating and error-prone)" },
      { slug: "hire-an-agency", label: "vs. Hiring a marketing agency ($2,000-$10,000/month)" },
    ],
  },
  {
    slug: "busy-owners-no-time",
    criteria: "Busy Owners With No Time",
    title: "Best Customer Marketing Platform for Busy Owners With No Time",
    heroSubhead:
      "You're already running the whole business. Social Perks is designed to give you back your hours — most users spend under 30 minutes per week on the platform.",
    needs: [
      { label: "Setup in under 30 minutes total", detail: "Owners don't have a full weekend to dedicate to new software." },
      { label: "Mostly hands-off after setup", detail: "Set it up once, then run for months with minimal touch." },
      { label: "Mobile-first dashboard", detail: "Owner is on the floor, not at a desk." },
      { label: "Auto-triggers for the right moments", detail: "Reviews, referrals, and UGC should happen automatically." },
      { label: "Weekly digest, not daily noise", detail: "One email per week with what matters." },
    ],
    whySocialPerks: [
      { headline: "15-minute setup wizard", detail: "Five steps, plain English, done in under 15 minutes." },
      { headline: "Hands-off automation", detail: "Review asks, referral nudges, and UGC prompts trigger automatically." },
      { headline: "Mobile-first dashboard", detail: "Approve submissions from your phone in 30 seconds." },
      { headline: "Weekly summary email", detail: "Every Monday: new reviews, referrals, UGC, key numbers. That's it." },
      { headline: "AI auto-approval", detail: "High-confidence submissions auto-approve so you only review edge cases." },
    ],
    workflow: [
      "Spend 15 minutes on initial setup.",
      "Print signage and put it in the right spots.",
      "After day 1, spend 5 minutes per day approving submissions on your phone.",
      "Every Monday, read the 1-minute weekly summary.",
      "Quarterly, log in to see the bigger trends and adjust if needed.",
    ],
    pricingTier: {
      tier: "Starter or Growth",
      price: "$49-$149/month",
      why: "Most busy owners fit Starter; those running multi-employee operations move to Growth for staff accounts and POS integration.",
    },
    alternativesToCheck: [
      { slug: "diy-marketing", label: "vs. DIY marketing (more time than you have)" },
      { slug: "hire-an-agency", label: "vs. Hiring an agency (5-10x the cost)" },
      { slug: "no-system", label: "vs. No system (lost referrals, missing reviews)" },
    ],
  },
  {
    slug: "bootstrappers",
    criteria: "Bootstrappers",
    title: "Best Customer Marketing Platform for Bootstrappers",
    heroSubhead:
      "No VC, no marketing team, no agency budget. Social Perks is the bootstrapper's secret weapon: turn your customer base into the growth engine you can't afford to hire.",
    needs: [
      { label: "Maximum ROI per dollar", detail: "Every $1 needs to return at least $5 — otherwise it gets cut." },
      { label: "Compounds without ongoing spend", detail: "Owned channels that keep working when you stop." },
      { label: "Replaces other tools, not adds to them", detail: "Should let you cancel 1-2 other subscriptions." },
      { label: "Founder-friendly setup", detail: "Founder can set it up themselves between customer calls." },
      { label: "Scales with the business", detail: "Same tool should work at $100/month revenue and $100K/month revenue." },
    ],
    whySocialPerks: [
      { headline: "Replaces 3-5 other tools", detail: "Reviews, referrals, loyalty, and UGC all in one platform — cancel the rest." },
      { headline: "Compounding owned channel", detail: "Once set up, it keeps producing customers without ongoing ad spend." },
      { headline: "Bootstrap-friendly pricing", detail: "$49/month to start, scale as you grow." },
      { headline: "Founder-first setup", detail: "Built so a non-marketer founder can run it." },
      { headline: "Scales from 1 customer to 100,000", detail: "Same platform, just upgrade tiers as you grow." },
    ],
    workflow: [
      "Sign up and set up the basics in your first work session.",
      "Cancel 1-2 of: review tool, loyalty tool, UGC tool, referral tool. They're all replaced by Social Perks.",
      "Run for 90 days with minimal touch.",
      "Review what's working monthly and double down.",
      "Most bootstrappers see customer acquisition cost drop 30-50% within 6 months.",
    ],
    pricingTier: {
      tier: "Starter",
      price: "$49/month",
      why: "Bootstrappers start on Starter. The ROI lets them upgrade to Growth on their own terms once revenue justifies it.",
    },
    alternativesToCheck: [
      { slug: "yotpo", label: "vs. Yotpo (enterprise pricing, anti-bootstrapper)" },
      { slug: "paid-ads-only", label: "vs. Paid ads only (rented audience, never owned)" },
      { slug: "diy-everything", label: "vs. DIY everything (time you should spend on the product)" },
    ],
  },
  {
    slug: "agencies",
    criteria: "Agencies",
    title: "Best Customer Marketing Platform for Agencies",
    heroSubhead:
      "Marketing and creative agencies need a tool that delivers wins for clients while generating recurring revenue for the agency. Social Perks white-labels, scales, and pays a partner share.",
    needs: [
      { label: "White-label or co-branded reporting", detail: "Client-facing reports should look like your brand, not someone else's." },
      { label: "Multi-client dashboard", detail: "Manage 10-50 clients from one login." },
      { label: "Per-client billing", detail: "Bill clients directly or pass through with markup." },
      { label: "Partner revenue share", detail: "Agencies should earn recurring revenue on every client referred." },
      { label: "Account management support", detail: "Dedicated account manager who understands agency workflows." },
    ],
    whySocialPerks: [
      { headline: "Agency partner program", detail: "20-30% recurring revenue share on every client account." },
      { headline: "Multi-client dashboard", detail: "Manage 10, 50, or 500 clients from one agency login." },
      { headline: "Co-branded reporting", detail: "Client-facing reports with your agency logo." },
      { headline: "Dedicated agency account manager", detail: "One human, one phone number, fast escalations." },
      { headline: "API and Zapier integrations", detail: "Plug into your existing client-management stack." },
    ],
    workflow: [
      "Join the Agency Partner Program (free).",
      "Onboard your first 3 clients with the agency's preferred templates.",
      "Roll out to your client roster, billed either through the agency or directly.",
      "Generate co-branded monthly reports for clients.",
      "Earn 20-30% recurring revenue share on every account.",
    ],
    pricingTier: {
      tier: "Premium (Agency)",
      price: "Custom",
      why: "Agencies need the Premium tier for multi-client management, co-branding, and partner revenue share. Pricing depends on client count and volume.",
    },
    alternativesToCheck: [
      { slug: "agency-direct-tools", label: "vs. Direct agency tools (more setup, less customer-marketing depth)" },
      { slug: "client-direct-vendors", label: "vs. Letting clients buy direct (no recurring agency revenue)" },
      { slug: "diy-agency-platform", label: "vs. Building an in-house platform (huge investment for low return)" },
    ],
  },
  {
    slug: "franchises",
    criteria: "Franchises",
    title: "Best Customer Marketing Platform for Franchises",
    heroSubhead:
      "Franchises balance brand consistency with local autonomy. Social Perks gives franchisors central control and franchisees local flexibility — without breaking either.",
    needs: [
      { label: "Centralized brand standards", detail: "Franchisor sets visual identity, voice, and core programs." },
      { label: "Local customization", detail: "Franchisees adapt perks to their market within the brand guardrails." },
      { label: "Multi-unit reporting", detail: "Franchisor sees system-wide performance and per-unit breakdown." },
      { label: "Royalty-compatible billing", detail: "Tie into the existing royalty and fee structure." },
      { label: "Franchisor and franchisee training included", detail: "Both sides need to be trained on the system." },
    ],
    whySocialPerks: [
      { headline: "Two-tier permission system", detail: "Franchisor controls brand; franchisees control local execution." },
      { headline: "System-wide reporting", detail: "Franchisor dashboard shows performance across every unit." },
      { headline: "Pre-built franchise playbooks", detail: "Tested perk programs designed specifically for franchise systems." },
      { headline: "Royalty-compatible billing", detail: "Bill at the franchisor level and roll into existing royalty structure." },
      { headline: "Franchise success team", detail: "Dedicated team that has launched 50+ franchise systems." },
    ],
    workflow: [
      "Franchisor signs the system-wide agreement.",
      "Build brand standards and core perks centrally.",
      "Roll out to all franchisees with location-specific QR codes.",
      "Train franchisees in a 30-minute virtual session.",
      "Review system-wide performance quarterly. Most franchises see 10-20% same-store sales lift in year one.",
    ],
    pricingTier: {
      tier: "Premium (Franchise)",
      price: "Custom",
      why: "Franchise systems require the Premium tier for two-tier permissions, system-wide reporting, and franchise-specific success support. Pricing depends on unit count.",
    },
    alternativesToCheck: [
      { slug: "punchh", label: "vs. Punchh (restaurant-focused, less flexible)" },
      { slug: "diy-franchise-tools", label: "vs. DIY franchise marketing tools (inconsistent execution)" },
      { slug: "franchisor-mandated-only", label: "vs. Franchisor-mandated only (no local flexibility, low adoption)" },
    ],
  },
  {
    slug: "mobile-businesses",
    criteria: "Mobile Businesses",
    title: "Best Customer Marketing Platform for Mobile Businesses",
    heroSubhead:
      "Mobile groomers, mobile car washes, pop-up shops — your business goes to the customer. Social Perks is built for mobile-first operations with no fixed storefront.",
    needs: [
      { label: "No fixed storefront required", detail: "Everything works without a brick-and-mortar location." },
      { label: "SMS-first customer communication", detail: "Mobile customers prefer text to email." },
      { label: "Location-flexible review collection", detail: "Customer is at home, not in your shop." },
      { label: "Per-tech or per-driver attribution", detail: "Multi-tech operations need to track who's driving referrals." },
      { label: "Mobile-first owner dashboard", detail: "Owner is in the field, not at a desk." },
    ],
    whySocialPerks: [
      { headline: "SMS-first workflow", detail: "Review and referral asks sent via text 24 hours after each appointment." },
      { headline: "No storefront required", detail: "Works for any business that has customers, even without a location." },
      { headline: "Per-tech attribution", detail: "Track which techs generate the most reviews and referrals." },
      { headline: "Mobile owner dashboard", detail: "Run the whole platform from your phone." },
      { headline: "Calendar and route integrations", detail: "Connect with field-service software like Jobber, Housecall Pro, ServiceTitan." },
    ],
    workflow: [
      "Connect your field-service software (Jobber, Housecall Pro, etc.).",
      "Set up perks: review after job = $20 credit, referral = $50 for both parties.",
      "SMS auto-fires 24 hours after every completed job.",
      "Approve submissions from your phone.",
      "Track per-tech performance and coach accordingly. Most mobile businesses double review volume in 60 days.",
    ],
    pricingTier: {
      tier: "Growth",
      price: "$149/month",
      why: "Mobile businesses need the Growth tier for SMS triggers, field-service software integration, and per-tech attribution.",
    },
    alternativesToCheck: [
      { slug: "podium", label: "vs. Podium (similar SMS focus, more expensive)" },
      { slug: "nicejob", label: "vs. NiceJob (review-only, no referrals or UGC)" },
      { slug: "manual-review-asks", label: "vs. Manual review asks (forgotten 70% of the time)" },
    ],
  },
];

export const BEST_FOR_SLUGS = BEST_FOR.map((b) => b.slug);
