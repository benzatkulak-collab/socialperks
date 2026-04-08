// ═══════════════════════════════════════════════════════════════════════
// Industry Landing Pages — SEO-optimized data for /for/[industry]
// ═══════════════════════════════════════════════════════════════════════

export interface IndustryUseCase {
  title: string;
  description: string;
  platform: string;
  action: string;
}

export interface IndustryStat {
  label: string;
  value: string;
}

export interface IndustryTemplate {
  name: string;
  platform: string;
  action: string;
  reward: string;
}

export interface IndustryPage {
  slug: string;
  name: string;
  headline: string;
  subheadline: string;
  description: string;
  icon: string;
  useCases: IndustryUseCase[];
  stats: IndustryStat[];
  testimonialQuote: string;
  testimonialAuthor: string;
  templateSuggestions: IndustryTemplate[];
  relatedIndustries: string[];
}

export const INDUSTRIES: IndustryPage[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    headline: "Turn Diners Into Your Marketing Team",
    subheadline:
      "Every meal is a marketing opportunity. Reward customers for sharing their experience and watch your tables fill up with new faces.",
    description:
      "Social Perks helps restaurants get more reviews, social posts, and check-ins. Reward diners for sharing — grow without paying for ads.",
    icon: "🍽️",
    useCases: [
      {
        title: "Google Review Boost",
        description:
          "Offer 10% off the next visit for a Google review. Most restaurants see 3-5x more reviews within the first month.",
        platform: "Google",
        action: "Leave a review",
      },
      {
        title: "Instagram Food Posts",
        description:
          "A free appetizer for tagging your restaurant in an Instagram post. Food content gets 120% more engagement than other categories.",
        platform: "Instagram",
        action: "Post a photo with tag",
      },
      {
        title: "TikTok Video Reviews",
        description:
          "Offer a complimentary dessert for a TikTok video. Short-form video reviews drive 2x more foot traffic than static posts.",
        platform: "TikTok",
        action: "Post a video review",
      },
    ],
    stats: [
      { label: "Average increase in Google reviews", value: "340%" },
      { label: "Cost per new customer acquired", value: "$2.40" },
      { label: "Customers who share when rewarded", value: "73%" },
    ],
    testimonialQuote:
      "We went from 12 reviews to over 200 in three months. Our weekend wait time doubled — in a good way.",
    testimonialAuthor: "Maria S., Owner of Sol Cocina",
    templateSuggestions: [
      {
        name: "Review & Return",
        platform: "Google",
        action: "Leave a 4+ star review",
        reward: "10% off next visit",
      },
      {
        name: "Foodie Photo",
        platform: "Instagram",
        action: "Post a tagged photo of your meal",
        reward: "Free appetizer",
      },
      {
        name: "Video Taste Test",
        platform: "TikTok",
        action: "Post a 15-second video review",
        reward: "Free dessert",
      },
    ],
    relatedIndustries: ["coffee-shops", "bakeries", "breweries", "bars"],
  },
  {
    slug: "coffee-shops",
    name: "Coffee Shops",
    headline: "Brew Buzz That Brings People In",
    subheadline:
      "Your regulars already love you. Give them a reason to tell everyone about their favorite coffee spot.",
    description:
      "Social Perks helps coffee shops grow with customer-powered marketing. Reward posts, reviews, and check-ins — no ad spend needed.",
    icon: "☕",
    useCases: [
      {
        title: "Morning Check-In Campaign",
        description:
          "A free size upgrade for a Google check-in. Customers broadcast their morning routine to hundreds of local followers.",
        platform: "Google",
        action: "Check in at location",
      },
      {
        title: "Latte Art Stories",
        description:
          "Free cookie with any Instagram Story featuring your latte art. Visual content from real customers outperforms branded ads 4:1.",
        platform: "Instagram",
        action: "Share a Story with tag",
      },
      {
        title: "Yelp Review Drive",
        description:
          "10% off for a Yelp review. Yelp reviews directly influence where 82% of consumers choose to eat and drink.",
        platform: "Yelp",
        action: "Write a review",
      },
    ],
    stats: [
      { label: "Average ROI on perk campaigns", value: "847%" },
      { label: "New customers per month from social", value: "45+" },
      { label: "Average cost per social impression", value: "$0.03" },
    ],
    testimonialQuote:
      "Our Instagram went from 400 followers to 3,200 in six months. All from customers who wanted a free pastry.",
    testimonialAuthor: "James K., Bloom Coffee Co.",
    templateSuggestions: [
      {
        name: "Morning Buzz",
        platform: "Google",
        action: "Check in with a photo",
        reward: "Free size upgrade",
      },
      {
        name: "Latte Art Share",
        platform: "Instagram",
        action: "Post a Story with location tag",
        reward: "Free cookie or pastry",
      },
      {
        name: "Review Roast",
        platform: "Yelp",
        action: "Write a detailed review",
        reward: "10% off next order",
      },
    ],
    relatedIndustries: ["restaurants", "bakeries", "breweries", "boutiques"],
  },
  {
    slug: "salons",
    name: "Hair Salons",
    headline: "Let Your Clients Show Off Their New Look",
    subheadline:
      "Every great haircut is a walking billboard. Turn happy clients into your most powerful marketing channel.",
    description:
      "Social Perks helps hair salons get more bookings through client-powered social media. Reward before-and-after posts and reviews.",
    icon: "💇",
    useCases: [
      {
        title: "Before & After Posts",
        description:
          "Offer $10 off the next appointment for an Instagram before-and-after post. Transformation content gets 5x more saves than average.",
        platform: "Instagram",
        action: "Post a before & after photo",
      },
      {
        title: "Google Review Builder",
        description:
          "A free deep conditioning treatment for a Google review. Salons with 50+ reviews get 35% more calls from search.",
        platform: "Google",
        action: "Leave a review",
      },
      {
        title: "Referral Stories",
        description:
          "Both the referrer and friend get 15% off when they share a referral link on their Instagram Story.",
        platform: "Instagram",
        action: "Share referral link in Story",
      },
    ],
    stats: [
      { label: "Increase in new bookings", value: "52%" },
      { label: "Average value per referred client", value: "$180" },
      { label: "Clients who rebook after sharing", value: "89%" },
    ],
    testimonialQuote:
      "My clients were already taking selfies after their appointments. Now they tag me and I get 5-10 new bookings a week from it.",
    testimonialAuthor: "Ashley R., Glow Studio",
    templateSuggestions: [
      {
        name: "Glow Up Share",
        platform: "Instagram",
        action: "Post a before & after with tag",
        reward: "$10 off next appointment",
      },
      {
        name: "Star Stylist",
        platform: "Google",
        action: "Leave a review mentioning your stylist",
        reward: "Free conditioning treatment",
      },
      {
        name: "Friend Referral",
        platform: "Instagram",
        action: "Share a referral Story",
        reward: "15% off for both",
      },
    ],
    relatedIndustries: ["barbershops", "spas", "boutiques", "tattoo-shops"],
  },
  {
    slug: "barbershops",
    name: "Barbershops",
    headline: "Fresh Cuts Deserve Fresh Followers",
    subheadline:
      "Your chair is a content studio. Help clients share their fresh fade and bring in the next one.",
    description:
      "Social Perks helps barbershops build a loyal client base through social proof. Reward posts, reviews, and referrals effortlessly.",
    icon: "💈",
    useCases: [
      {
        title: "Fresh Fade Photo",
        description:
          "A free beard trim for an Instagram post showing off the cut. Barbershop content is one of the most-shared categories on social.",
        platform: "Instagram",
        action: "Post a photo of your fresh cut",
      },
      {
        title: "Google Maps Visibility",
        description:
          "Free product sample for a Google review. Shops with strong reviews rank higher in local 'barbershop near me' searches.",
        platform: "Google",
        action: "Leave a review with photo",
      },
      {
        title: "TikTok Transformation",
        description:
          "$5 off the next cut for a TikTok before-and-after video. Barbershop transformations consistently go viral.",
        platform: "TikTok",
        action: "Post a transformation video",
      },
    ],
    stats: [
      { label: "New clients from social shares", value: "38/mo" },
      { label: "Average review score increase", value: "0.6 stars" },
      { label: "Client retention with perks", value: "94%" },
    ],
    testimonialQuote:
      "Used to rely on walk-ins. Now I am booked two weeks out because clients keep posting their cuts and tagging the shop.",
    testimonialAuthor: "DeShawn M., Iron Cuts",
    templateSuggestions: [
      {
        name: "Clean Cut Share",
        platform: "Instagram",
        action: "Post a selfie with tag",
        reward: "Free beard trim next visit",
      },
      {
        name: "Rate Your Barber",
        platform: "Google",
        action: "Write a review with photo",
        reward: "Free styling product sample",
      },
    ],
    relatedIndustries: ["salons", "tattoo-shops", "spas", "gyms"],
  },
  {
    slug: "gyms",
    name: "Gyms & Fitness Studios",
    headline: "Turn Members Into Your Best Recruiters",
    subheadline:
      "Fitness communities thrive on social proof. Reward members for sharing their journey and watch your sign-ups grow.",
    description:
      "Social Perks helps gyms and fitness studios grow membership through member-powered marketing. Reward check-ins, posts, and referrals.",
    icon: "🏋️",
    useCases: [
      {
        title: "Workout Check-In",
        description:
          "Free smoothie or protein bar for a gym check-in on social media. Consistent visibility keeps your gym top-of-mind in the community.",
        platform: "Facebook",
        action: "Check in at the gym",
      },
      {
        title: "Transformation Stories",
        description:
          "One free month for sharing a transformation story on Instagram. Real results from real members convert 7x better than stock photos.",
        platform: "Instagram",
        action: "Post a transformation story",
      },
      {
        title: "Buddy Referral",
        description:
          "Both friends get two weeks free when someone shares a referral link. People who work out with friends retain 3x longer.",
        platform: "Instagram",
        action: "Share referral link",
      },
    ],
    stats: [
      { label: "Increase in trial sign-ups", value: "67%" },
      { label: "Cost per new member acquired", value: "$4.80" },
      { label: "Referred members retained 6+ months", value: "81%" },
    ],
    testimonialQuote:
      "We cut our Facebook ad budget by 60% and got more sign-ups. Turns out people trust their gym buddy more than a targeted ad.",
    testimonialAuthor: "Carlos V., Summit Fitness",
    templateSuggestions: [
      {
        name: "Sweat & Share",
        platform: "Facebook",
        action: "Check in after a workout",
        reward: "Free smoothie or protein bar",
      },
      {
        name: "Progress Post",
        platform: "Instagram",
        action: "Share a progress photo with tag",
        reward: "Free personal training session",
      },
      {
        name: "Gym Buddy Referral",
        platform: "Instagram",
        action: "Share referral link in bio or Story",
        reward: "2 weeks free for both",
      },
    ],
    relatedIndustries: ["yoga-studios", "spas", "salons", "barbershops"],
  },
  {
    slug: "yoga-studios",
    name: "Yoga Studios",
    headline: "Grow Your Studio With Peaceful Marketing",
    subheadline:
      "Your community is your greatest asset. Reward students for spreading the word and fill every class.",
    description:
      "Social Perks helps yoga studios attract new students through community-powered social media marketing. No ad spend required.",
    icon: "🧘",
    useCases: [
      {
        title: "Class Check-In",
        description:
          "Free mat rental for a check-in on Instagram Stories. Regular visibility turns your studio into the neighborhood go-to.",
        platform: "Instagram",
        action: "Share a Story from class",
      },
      {
        title: "Mindful Review",
        description:
          "One free class for a Google review. Studios with authentic reviews rank 40% higher for 'yoga near me' searches.",
        platform: "Google",
        action: "Write a thoughtful review",
      },
      {
        title: "Bring a Friend",
        description:
          "Free class for both when a student shares a referral link. Yoga students who come with a friend attend 2x more often.",
        platform: "Facebook",
        action: "Share event or referral link",
      },
    ],
    stats: [
      { label: "New students per month from referrals", value: "28+" },
      { label: "Class fill rate improvement", value: "41%" },
      { label: "Student retention with perks", value: "86%" },
    ],
    testimonialQuote:
      "Our 6am classes used to be half empty. After launching a check-in campaign, they are consistently full. Students love the free class passes.",
    testimonialAuthor: "Priya N., Solstice Yoga",
    templateSuggestions: [
      {
        name: "Namaste & Share",
        platform: "Instagram",
        action: "Post a Story from class with tag",
        reward: "Free mat rental for a week",
      },
      {
        name: "Mindful Review",
        platform: "Google",
        action: "Write a review about your experience",
        reward: "One free drop-in class",
      },
      {
        name: "Bring a Friend Flow",
        platform: "Facebook",
        action: "Share an event invite",
        reward: "Free class for both",
      },
    ],
    relatedIndustries: ["gyms", "spas", "salons", "boutiques"],
  },
  {
    slug: "dentists",
    name: "Dental Practices",
    headline: "Give Patients a Reason to Smile — and Share",
    subheadline:
      "Patient referrals are the lifeblood of dental practices. Automate the ask and reward the share.",
    description:
      "Social Perks helps dental practices grow with patient-powered referrals. Reward reviews and social shares to fill your schedule.",
    icon: "🦷",
    useCases: [
      {
        title: "Post-Visit Review",
        description:
          "Free whitening strips for a Google review. Dental practices with 100+ reviews receive 50% more appointment requests.",
        platform: "Google",
        action: "Leave a review after appointment",
      },
      {
        title: "Smile Selfie Campaign",
        description:
          "$15 off next cleaning for sharing a smile selfie on Facebook. Authentic patient content builds trust faster than any ad.",
        platform: "Facebook",
        action: "Share a photo with tag",
      },
      {
        title: "Family Referral",
        description:
          "$25 credit for both parties when a patient refers a family member. Dental patients referred by friends have 3x higher lifetime value.",
        platform: "Google",
        action: "Share referral link",
      },
    ],
    stats: [
      { label: "Increase in new patient inquiries", value: "58%" },
      { label: "Average cost per new patient", value: "$8.50" },
      { label: "Patients who refer when incentivized", value: "44%" },
    ],
    testimonialQuote:
      "We stopped buying ads on Google and started rewarding patients for reviews. Our new patient calls went up, not down.",
    testimonialAuthor: "Dr. Sarah L., Bright Smile Dental",
    templateSuggestions: [
      {
        name: "Happy Mouth Review",
        platform: "Google",
        action: "Leave a review after your visit",
        reward: "Free whitening strips",
      },
      {
        name: "Smile Selfie",
        platform: "Facebook",
        action: "Post a smile selfie with tag",
        reward: "$15 off next cleaning",
      },
      {
        name: "Family First Referral",
        platform: "Google",
        action: "Refer a family member",
        reward: "$25 credit for both",
      },
    ],
    relatedIndustries: ["veterinarians", "spas", "salons", "yoga-studios"],
  },
  {
    slug: "veterinarians",
    name: "Veterinary Clinics",
    headline: "Pet Parents Love Sharing — Reward Them For It",
    subheadline:
      "Pet content is the most shared category on social media. Turn every vet visit into a marketing moment.",
    description:
      "Social Perks helps vet clinics grow through pet-parent social sharing. Reward posts and reviews — pet content goes viral naturally.",
    icon: "🐾",
    useCases: [
      {
        title: "Healthy Pet Post",
        description:
          "Free dental treat bag for an Instagram post with your clinic tagged. Pet photos are shared 3x more than any other content type.",
        platform: "Instagram",
        action: "Post a photo of your pet at the clinic",
      },
      {
        title: "Google Review Drive",
        description:
          "10% off next visit for a Google review. Vet clinics with strong reviews dominate 'vet near me' search results.",
        platform: "Google",
        action: "Write a review",
      },
      {
        title: "New Pet Parent Referral",
        description:
          "$20 off for both when a client refers a new pet parent. Referrals account for 60% of new vet clients.",
        platform: "Facebook",
        action: "Share a referral post",
      },
    ],
    stats: [
      { label: "Social reach from pet posts", value: "12x avg" },
      { label: "New clients per month from social", value: "32+" },
      { label: "Client retention with perks program", value: "91%" },
    ],
    testimonialQuote:
      "Turns out people will do literally anything for their pets. Posting a photo for free treats? Our Google reviews tripled in two months.",
    testimonialAuthor: "Dr. Mike T., Paws & Claws Veterinary",
    templateSuggestions: [
      {
        name: "Healthy Paws Post",
        platform: "Instagram",
        action: "Post a pet photo with clinic tag",
        reward: "Free dental treat bag",
      },
      {
        name: "Pet Parent Review",
        platform: "Google",
        action: "Write a review about your visit",
        reward: "10% off next visit",
      },
      {
        name: "Furry Friend Referral",
        platform: "Facebook",
        action: "Share a referral link",
        reward: "$20 off for both pet parents",
      },
    ],
    relatedIndustries: ["pet-stores", "dentists", "salons", "gyms"],
  },
  {
    slug: "auto-repair",
    name: "Auto Repair Shops",
    headline: "Turn Satisfied Drivers Into 5-Star Ambassadors",
    subheadline:
      "Trust is everything in auto repair. Let your happiest customers build it for you, one review at a time.",
    description:
      "Social Perks helps auto repair shops build trust and grow with customer reviews and referrals. Reward honest feedback and sharing.",
    icon: "🔧",
    useCases: [
      {
        title: "Trust Review Campaign",
        description:
          "Free tire rotation for a Google review. In auto repair, reviews are the number one factor in choosing a shop — above price.",
        platform: "Google",
        action: "Leave a detailed review",
      },
      {
        title: "Nextdoor Recommendation",
        description:
          "$10 off next service for a Nextdoor recommendation. Hyperlocal platforms drive the highest conversion for auto shops.",
        platform: "Nextdoor",
        action: "Write a recommendation",
      },
      {
        title: "Neighbor Referral",
        description:
          "Free oil change for both when a customer refers a neighbor. Word-of-mouth referrals have a 92% trust rating.",
        platform: "Facebook",
        action: "Share referral post to local groups",
      },
    ],
    stats: [
      { label: "Increase in Google review volume", value: "280%" },
      { label: "Revenue from referred customers", value: "+$4,200/mo" },
      { label: "Customer lifetime value increase", value: "63%" },
    ],
    testimonialQuote:
      "People used to be skeptical about mechanics. Now I have 400+ reviews and people drive 30 minutes to come here instead of the shop next door.",
    testimonialAuthor: "Tony R., Honest Wrench Auto",
    templateSuggestions: [
      {
        name: "Honest Review",
        platform: "Google",
        action: "Write a review about your service",
        reward: "Free tire rotation",
      },
      {
        name: "Neighborhood Trust",
        platform: "Nextdoor",
        action: "Recommend us on Nextdoor",
        reward: "$10 off next service",
      },
      {
        name: "Drive a Friend",
        platform: "Facebook",
        action: "Refer a friend via social share",
        reward: "Free oil change for both",
      },
    ],
    relatedIndustries: ["real-estate", "dentists", "gyms", "restaurants"],
  },
  {
    slug: "real-estate",
    name: "Real Estate Agents",
    headline: "Turn Closings Into a Pipeline of Referrals",
    subheadline:
      "Every happy homeowner knows someone else looking to buy. Make it easy and rewarding for them to connect you.",
    description:
      "Social Perks helps real estate agents generate referrals and testimonials from past clients. Automate the ask, reward the share.",
    icon: "🏠",
    useCases: [
      {
        title: "Closing Day Post",
        description:
          "$50 gift card for a 'Just sold' Instagram post tagging the agent. Closing day content gets massive engagement from friends who are house-hunting.",
        platform: "Instagram",
        action: "Post a closing day photo with tag",
      },
      {
        title: "Zillow Review Request",
        description:
          "Professional home staging consultation for a Zillow review. Agents with 25+ Zillow reviews get 4x more inquiries.",
        platform: "Zillow",
        action: "Write a detailed review",
      },
      {
        title: "Homeowner Referral",
        description:
          "$200 referral bonus when a past client sends a buyer who closes. Real estate referrals have the highest close rate of any lead source.",
        platform: "Facebook",
        action: "Share referral link or tag in post",
      },
    ],
    stats: [
      { label: "Referral close rate vs cold leads", value: "4.5x" },
      { label: "Average commission from referral deals", value: "$8,400" },
      { label: "Past clients who refer when asked", value: "29%" },
    ],
    testimonialQuote:
      "I closed 8 deals last quarter from past client referrals alone. The perk program paid for itself with one transaction.",
    testimonialAuthor: "Rachel K., The Keys Group Realty",
    templateSuggestions: [
      {
        name: "Closing Day Share",
        platform: "Instagram",
        action: "Post a sold/closing photo with tag",
        reward: "$50 gift card",
      },
      {
        name: "Agent Review",
        platform: "Zillow",
        action: "Write a review on Zillow/Realtor.com",
        reward: "Home staging consultation",
      },
      {
        name: "House Hunter Referral",
        platform: "Facebook",
        action: "Refer a buyer or seller",
        reward: "$200 bonus at close",
      },
    ],
    relatedIndustries: ["photographers", "auto-repair", "dentists", "florists"],
  },
  {
    slug: "hotels",
    name: "Hotels & B&Bs",
    headline: "Turn Every Stay Into a Booking Engine",
    subheadline:
      "Guests already photograph their room, their view, and their breakfast. Reward them and reach their entire network.",
    description:
      "Social Perks helps hotels and B&Bs drive direct bookings through guest-powered social media. Reward posts, reviews, and shares.",
    icon: "🏨",
    useCases: [
      {
        title: "Room With a View Post",
        description:
          "Free late checkout for an Instagram post with the hotel tagged. Travel content reaches an average of 800 people per post.",
        platform: "Instagram",
        action: "Post a photo from the hotel with tag",
      },
      {
        title: "TripAdvisor Review",
        description:
          "Complimentary breakfast for a TripAdvisor review. Hotels in the top 10% on TripAdvisor see 22% more direct bookings.",
        platform: "TripAdvisor",
        action: "Write a detailed review",
      },
      {
        title: "Group Booking Share",
        description:
          "10% off group rates when guests share an event booking link. Wedding and event referrals average $3,200 per booking.",
        platform: "Facebook",
        action: "Share event booking page",
      },
    ],
    stats: [
      { label: "Increase in direct bookings", value: "34%" },
      { label: "Social media reach per guest post", value: "800+" },
      { label: "Savings vs OTA commission fees", value: "$12K/yr" },
    ],
    testimonialQuote:
      "Our guests already loved taking photos. Adding a perk turned those photos into bookings. We reduced our Booking.com dependency by 25%.",
    testimonialAuthor: "Elena P., Harbor View Inn",
    templateSuggestions: [
      {
        name: "Check-In & Share",
        platform: "Instagram",
        action: "Post a photo with hotel tag",
        reward: "Free late checkout",
      },
      {
        name: "Guest Review",
        platform: "TripAdvisor",
        action: "Write a review about your stay",
        reward: "Complimentary breakfast",
      },
    ],
    relatedIndustries: ["restaurants", "spas", "photographers", "breweries"],
  },
  {
    slug: "retail",
    name: "Retail Stores",
    headline: "Every Purchase Is a Social Media Moment",
    subheadline:
      "Shoppers love sharing their finds. Give them a perk and turn every bag into a billboard.",
    description:
      "Social Perks helps retail stores drive foot traffic and online sales through customer social sharing. Reward posts and reviews.",
    icon: "🛍️",
    useCases: [
      {
        title: "Haul Post Campaign",
        description:
          "15% off next purchase for an Instagram haul post. Shopping haul content drives 3x more store visits than display ads.",
        platform: "Instagram",
        action: "Post a shopping haul with tag",
      },
      {
        title: "Google Shopping Review",
        description:
          "Free gift with next purchase for a Google review. Stores with 4.5+ stars see 28% higher click-through from Maps.",
        platform: "Google",
        action: "Leave a review",
      },
      {
        title: "Pinterest Product Pin",
        description:
          "$5 store credit for pinning a product to Pinterest. Pinterest shoppers spend 2x more per order than other social platforms.",
        platform: "Pinterest",
        action: "Pin a product from the store",
      },
    ],
    stats: [
      { label: "Increase in foot traffic", value: "43%" },
      { label: "Average order value from referred customers", value: "+22%" },
      { label: "Customer acquisition cost vs ads", value: "75% less" },
    ],
    testimonialQuote:
      "Our customers started creating content better than anything we could produce. And they did it for 15% off their next visit.",
    testimonialAuthor: "Lisa M., Thread & Needle Boutique",
    templateSuggestions: [
      {
        name: "Shopping Haul",
        platform: "Instagram",
        action: "Post a haul photo with store tag",
        reward: "15% off next purchase",
      },
      {
        name: "Shop Local Review",
        platform: "Google",
        action: "Write a review",
        reward: "Free gift with next purchase",
      },
      {
        name: "Pin & Save",
        platform: "Pinterest",
        action: "Pin a product from the store",
        reward: "$5 store credit",
      },
    ],
    relatedIndustries: ["boutiques", "salons", "florists", "bakeries"],
  },
  {
    slug: "spas",
    name: "Spas & Wellness Centers",
    headline: "Relaxation Worth Sharing — and Rewarding",
    subheadline:
      "Your clients leave feeling amazing. Capture that moment and turn it into your best marketing asset.",
    description:
      "Social Perks helps spas and wellness centers grow with client-powered social proof. Reward reviews, posts, and referrals.",
    icon: "🧖",
    useCases: [
      {
        title: "Post-Treatment Glow",
        description:
          "Free aromatherapy upgrade for an Instagram Story from the spa. Wellness content generates the highest engagement rates on Instagram.",
        platform: "Instagram",
        action: "Share a Story with location tag",
      },
      {
        title: "Google Relaxation Review",
        description:
          "$15 off next visit for a Google review. Spas with 4.8+ stars charge 20% more without losing bookings.",
        platform: "Google",
        action: "Write a review",
      },
      {
        title: "Couples Referral",
        description:
          "Free add-on service for both when a client refers a friend. Spa referrals have a 74% conversion rate.",
        platform: "Facebook",
        action: "Share referral post or tag a friend",
      },
    ],
    stats: [
      { label: "New client bookings from social", value: "36/mo" },
      { label: "Average client spend increase", value: "+27%" },
      { label: "Referral conversion rate", value: "74%" },
    ],
    testimonialQuote:
      "We used to rely on Groupon. Now our own clients fill our calendar through social shares and it costs us a fraction.",
    testimonialAuthor: "Jade W., Serenity Spa & Wellness",
    templateSuggestions: [
      {
        name: "Spa Day Share",
        platform: "Instagram",
        action: "Post a Story with location tag",
        reward: "Free aromatherapy upgrade",
      },
      {
        name: "Wellness Review",
        platform: "Google",
        action: "Write a review about your experience",
        reward: "$15 off next visit",
      },
      {
        name: "Treat a Friend",
        platform: "Facebook",
        action: "Refer a friend via social",
        reward: "Free add-on service for both",
      },
    ],
    relatedIndustries: ["salons", "yoga-studios", "hotels", "gyms"],
  },
  {
    slug: "bakeries",
    name: "Bakeries",
    headline: "Every Pastry Tells a Story — Help Customers Share It",
    subheadline:
      "Beautiful baked goods practically photograph themselves. Reward the share and watch new customers line up.",
    description:
      "Social Perks helps bakeries grow through customer-powered social media. Reward photo posts, reviews, and referrals effortlessly.",
    icon: "🧁",
    useCases: [
      {
        title: "Pretty Pastry Post",
        description:
          "Free cookie with next purchase for an Instagram post. Bakery content is the most-saved food category on Instagram.",
        platform: "Instagram",
        action: "Post a photo of your order with tag",
      },
      {
        title: "Sweet Review",
        description:
          "10% off next order for a Google review. Local bakeries with strong reviews dominate weekend search traffic.",
        platform: "Google",
        action: "Leave a review",
      },
      {
        title: "Birthday Cake Referral",
        description:
          "Free cupcakes for both when a customer refers someone for a custom cake order. Custom orders average $120+.",
        platform: "Instagram",
        action: "Tag a friend in a post or Story",
      },
    ],
    stats: [
      { label: "Increase in weekend foot traffic", value: "55%" },
      { label: "Custom order inquiries from social", value: "+340%" },
      { label: "Average perk cost per new customer", value: "$1.80" },
    ],
    testimonialQuote:
      "Our croissant photo went semi-viral after a customer posted it for a free cookie. We had a line out the door that Saturday.",
    testimonialAuthor: "Sophie B., Baked & Wired",
    templateSuggestions: [
      {
        name: "Sweet Shot",
        platform: "Instagram",
        action: "Post a photo of your order with tag",
        reward: "Free cookie",
      },
      {
        name: "Baker's Review",
        platform: "Google",
        action: "Write a review",
        reward: "10% off next order",
      },
      {
        name: "Cake Referral",
        platform: "Instagram",
        action: "Tag a friend for custom cake orders",
        reward: "Free cupcakes for both",
      },
    ],
    relatedIndustries: ["coffee-shops", "restaurants", "florists", "boutiques"],
  },
  {
    slug: "breweries",
    name: "Breweries & Taprooms",
    headline: "Craft Buzz That Fills Your Taproom",
    subheadline:
      "Beer culture is social by nature. Reward the check-ins, the flight photos, and the 'you have to try this' posts.",
    description:
      "Social Perks helps breweries and taprooms grow through customer social sharing. Reward check-ins, reviews, and event shares.",
    icon: "🍺",
    useCases: [
      {
        title: "Taproom Check-In",
        description:
          "Free tasting flight for a check-in on Untappd or Instagram. Beer check-ins reach an average of 400 followers per post.",
        platform: "Instagram",
        action: "Check in with a photo",
      },
      {
        title: "Beer Review",
        description:
          "Free pint of the brewer's choice for a Google review. Breweries with 200+ reviews attract weekend visitors from 30+ miles away.",
        platform: "Google",
        action: "Write a review",
      },
      {
        title: "Event Hype Share",
        description:
          "Free first beer at the event for sharing an event post. Social shares drive 60% of brewery event attendance.",
        platform: "Facebook",
        action: "Share an event post",
      },
    ],
    stats: [
      { label: "Increase in weekend visitors", value: "48%" },
      { label: "Event attendance from social shares", value: "+62%" },
      { label: "Average spend per referred visitor", value: "$38" },
    ],
    testimonialQuote:
      "We launched a check-in campaign before our anniversary party. Sold out for the first time ever. Free tasting flights were the best marketing investment we made.",
    testimonialAuthor: "Ryan D., Forge Brewing Co.",
    templateSuggestions: [
      {
        name: "Tap & Tag",
        platform: "Instagram",
        action: "Post a photo with brewery tag",
        reward: "Free tasting flight",
      },
      {
        name: "Pint-Sized Review",
        platform: "Google",
        action: "Write a review",
        reward: "Free pint of brewer's choice",
      },
      {
        name: "Event Hype",
        platform: "Facebook",
        action: "Share an event post",
        reward: "Free first beer at the event",
      },
    ],
    relatedIndustries: ["restaurants", "coffee-shops", "hotels", "bakeries"],
  },
  {
    slug: "florists",
    name: "Florists",
    headline: "Beautiful Arrangements Deserve Beautiful Marketing",
    subheadline:
      "Flowers are the most photographed purchase on social media. Turn every bouquet into a new customer.",
    description:
      "Social Perks helps florists grow through customer photo sharing and reviews. Reward the natural urge to share beautiful flowers.",
    icon: "💐",
    useCases: [
      {
        title: "Bouquet Photo Share",
        description:
          "$5 off next order for an Instagram post. Flower photos are shared and saved 4x more than average content.",
        platform: "Instagram",
        action: "Post a photo of your arrangement with tag",
      },
      {
        title: "Wedding Vendor Review",
        description:
          "Free boutonniere with next wedding order for a Google review. Florists with strong reviews get 3x more wedding inquiries.",
        platform: "Google",
        action: "Write a detailed review",
      },
      {
        title: "Gift Referral",
        description:
          "Free delivery for both when a recipient refers the sender. Gift recipients are 5x more likely to become customers.",
        platform: "Instagram",
        action: "Tag the sender and the florist in a post",
      },
    ],
    stats: [
      { label: "Wedding inquiry increase", value: "3.2x" },
      { label: "Social media reach per flower post", value: "1,200+" },
      { label: "Gift-to-customer conversion rate", value: "18%" },
    ],
    testimonialQuote:
      "Every bride who posts her bouquet brings me two more consultations. The cost of a $5 discount per arrangement is nothing compared to a wedding booking.",
    testimonialAuthor: "Nina C., Bloom & Vine Florals",
    templateSuggestions: [
      {
        name: "Petal Post",
        platform: "Instagram",
        action: "Post a photo of your flowers with tag",
        reward: "$5 off next order",
      },
      {
        name: "Bloom Review",
        platform: "Google",
        action: "Write a review",
        reward: "Free boutonniere with next wedding order",
      },
    ],
    relatedIndustries: ["photographers", "bakeries", "boutiques", "real-estate"],
  },
  {
    slug: "photographers",
    name: "Photographers",
    headline: "Your Best Portfolio Pieces Are in Your Clients' Hands",
    subheadline:
      "When clients share your work, it reaches the exact audience you want. Reward them for doing what they were already going to do.",
    description:
      "Social Perks helps photographers get more bookings through client-powered sharing. Reward social posts, reviews, and referrals.",
    icon: "📸",
    useCases: [
      {
        title: "Gallery Share Campaign",
        description:
          "Free 8x10 print for sharing a gallery photo on Instagram with photographer tag. Client shares reach engaged audiences of friends in similar life stages.",
        platform: "Instagram",
        action: "Share a photo from the session with tag",
      },
      {
        title: "Google Portfolio Review",
        description:
          "Free mini session for a Google review with a photo. Photographers with 50+ reviews book 45% more sessions per quarter.",
        platform: "Google",
        action: "Write a review with a session photo",
      },
      {
        title: "Engagement Session Referral",
        description:
          "$50 print credit for both when a client refers someone who books. Referred photography clients spend 35% more on average.",
        platform: "Instagram",
        action: "Tag a friend in a Story or post",
      },
    ],
    stats: [
      { label: "Bookings from client referrals", value: "62%" },
      { label: "Average booking value from referrals", value: "+35%" },
      { label: "Clients who share when incentivized", value: "78%" },
    ],
    testimonialQuote:
      "I used to chase leads on The Knot. Now my couples tag me and their engaged friends DM me directly. I booked 12 weddings from referrals last year.",
    testimonialAuthor: "Marcus W., Marcus Webb Photography",
    templateSuggestions: [
      {
        name: "Gallery Share",
        platform: "Instagram",
        action: "Share a session photo with tag",
        reward: "Free 8x10 print",
      },
      {
        name: "Photographer Review",
        platform: "Google",
        action: "Write a review with photo",
        reward: "Free mini session",
      },
      {
        name: "Snapshot Referral",
        platform: "Instagram",
        action: "Refer a friend who books",
        reward: "$50 print credit for both",
      },
    ],
    relatedIndustries: ["florists", "real-estate", "hotels", "salons"],
  },
  {
    slug: "tattoo-shops",
    name: "Tattoo Shops",
    headline: "Ink That Markets Itself",
    subheadline:
      "Tattoo clients already show off their new ink to everyone they know. Reward the share and book your next appointment.",
    description:
      "Social Perks helps tattoo shops fill their books through client-powered social sharing. Reward posts, reviews, and referrals.",
    icon: "🎨",
    useCases: [
      {
        title: "Fresh Ink Post",
        description:
          "$15 off next session for an Instagram post showing their new tattoo. Tattoo reveals are one of the highest-engagement content types on social media.",
        platform: "Instagram",
        action: "Post a photo of new tattoo with shop tag",
      },
      {
        title: "Artist Review",
        description:
          "Free touch-up for a Google review mentioning the artist. Reviews naming specific artists drive 2x more appointment requests for that artist.",
        platform: "Google",
        action: "Write a review mentioning your artist",
      },
      {
        title: "Flash Day Referral",
        description:
          "Priority booking for both on flash days when a client refers a friend. Flash events with social promotion sell out 3x faster.",
        platform: "Instagram",
        action: "Tag a friend in a flash event post",
      },
    ],
    stats: [
      { label: "New client bookings from social", value: "44/mo" },
      { label: "Artist waitlist growth", value: "+180%" },
      { label: "Average client lifetime value increase", value: "52%" },
    ],
    testimonialQuote:
      "My clients were already posting their tattoos on Instagram. Adding a $15 perk just made them tag us. My books are full three months out now.",
    testimonialAuthor: "Alex J., Ink & Iron Studio",
    templateSuggestions: [
      {
        name: "Fresh Ink Reveal",
        platform: "Instagram",
        action: "Post a photo of your new tattoo with tag",
        reward: "$15 off next session",
      },
      {
        name: "Artist Shoutout",
        platform: "Google",
        action: "Write a review mentioning your artist",
        reward: "Free touch-up session",
      },
    ],
    relatedIndustries: ["barbershops", "salons", "photographers", "boutiques"],
  },
  {
    slug: "pet-stores",
    name: "Pet Stores",
    headline: "Pet Parents Share Everything — Reward the Habit",
    subheadline:
      "Pet content dominates social media. Turn your store into the go-to recommendation in every pet parent group.",
    description:
      "Social Perks helps pet stores grow with pet-parent-powered social media marketing. Reward posts, reviews, and referrals naturally.",
    icon: "🐕",
    useCases: [
      {
        title: "New Toy Unboxing",
        description:
          "Free treat bag for an Instagram Reel of their pet with a new toy. Pet unboxing content averages 2x the engagement of standard posts.",
        platform: "Instagram",
        action: "Post a Reel of your pet with a store purchase",
      },
      {
        title: "Local Pet Store Review",
        description:
          "10% off next purchase for a Google review. Local pet stores with strong reviews take market share from big chains.",
        platform: "Google",
        action: "Write a review",
      },
      {
        title: "Dog Park Referral",
        description:
          "Free sample bag for both when a customer refers a fellow pet parent. Pet owners trust recommendations from other pet owners above all else.",
        platform: "Facebook",
        action: "Share a referral post in pet parent groups",
      },
    ],
    stats: [
      { label: "Increase in repeat customers", value: "47%" },
      { label: "Social reach from pet content", value: "2,400+" },
      { label: "Market share gained vs chains", value: "+15%" },
    ],
    testimonialQuote:
      "We compete with PetSmart down the street. But our customers post about us constantly and people drive past the chain to come here.",
    testimonialAuthor: "Jenny P., The Puppy Pantry",
    templateSuggestions: [
      {
        name: "Happy Pet Post",
        platform: "Instagram",
        action: "Post a photo/Reel of your pet with store tag",
        reward: "Free treat bag",
      },
      {
        name: "Local Love Review",
        platform: "Google",
        action: "Write a review about your experience",
        reward: "10% off next purchase",
      },
      {
        name: "Pack Referral",
        platform: "Facebook",
        action: "Refer a fellow pet parent",
        reward: "Free sample bag for both",
      },
    ],
    relatedIndustries: ["veterinarians", "bakeries", "boutiques", "florists"],
  },
  {
    slug: "boutiques",
    name: "Boutiques",
    headline: "Turn Every Fitting Room Into a Content Studio",
    subheadline:
      "Unique finds deserve to be shared. Reward your customers for doing what they love — showing off their style.",
    description:
      "Social Perks helps boutiques and independent shops grow through customer-powered social media. Reward posts, reviews, and style shares.",
    icon: "👗",
    useCases: [
      {
        title: "OOTD Post Campaign",
        description:
          "15% off next purchase for an outfit-of-the-day Instagram post. Fashion try-on content drives 4x more saves and shares than brand posts.",
        platform: "Instagram",
        action: "Post an OOTD with boutique tag",
      },
      {
        title: "Hidden Gem Review",
        description:
          "Free accessory with next purchase for a Google review. Boutiques with 'hidden gem' reviews see a 50% lift in first-time visitors.",
        platform: "Google",
        action: "Write a review",
      },
      {
        title: "Style Share Referral",
        description:
          "$10 credit for both when a customer refers a friend. Fashion referrals convert at 3x the rate of paid social ads.",
        platform: "Instagram",
        action: "Send a referral link via DM or Story",
      },
    ],
    stats: [
      { label: "First-time visitor increase", value: "58%" },
      { label: "Average order value from social", value: "+31%" },
      { label: "Customer-created content per month", value: "120+" },
    ],
    testimonialQuote:
      "My customers create better content than any influencer I could hire. A 15% discount costs me less than one sponsored post and brings in way more traffic.",
    testimonialAuthor: "Mia T., Wildflower Boutique",
    templateSuggestions: [
      {
        name: "Style Share",
        platform: "Instagram",
        action: "Post an outfit photo with boutique tag",
        reward: "15% off next purchase",
      },
      {
        name: "Boutique Find Review",
        platform: "Google",
        action: "Write a review",
        reward: "Free accessory with next purchase",
      },
      {
        name: "Fashion Friend Referral",
        platform: "Instagram",
        action: "Send a referral link to a friend",
        reward: "$10 credit for both",
      },
    ],
    relatedIndustries: ["salons", "florists", "retail", "coffee-shops"],
  },
];

/** Lookup map: slug → IndustryPage */
export const INDUSTRY_MAP = new Map(
  INDUSTRIES.map((industry) => [industry.slug, industry])
);

/** All valid industry slugs for static generation */
export const INDUSTRY_SLUGS = INDUSTRIES.map((i) => i.slug);
