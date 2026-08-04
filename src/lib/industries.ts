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
  /**
   * Attribution for third-party consumer-behavior figures (e.g. Nielsen,
   * BrightLocal). Rendered as a visible "Source:" line. Omit for
   * product-true statements — facts about how Social Perks works, which
   * are verifiable by using the product and need no external citation.
   */
  source?: string;
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
  templateSuggestions: IndustryTemplate[];
  relatedIndustries: string[];
}

// Well-established, conservatively-stated third-party consumer-behavior
// figures. These are qualitative/floor values chosen to stay defensible
// across every published version of their source survey — we never
// overstate. Reused across industry pages so the "why word-of-mouth works"
// claim always carries a real citation rather than an invented outcome.
const NIELSEN_TRUST: IndustryStat = {
  value: "#1",
  label:
    "Recommendations from people you know are the most-trusted form of advertising",
  source: "Nielsen, Global Trust in Advertising",
};

const BRIGHTLOCAL_REVIEWS: IndustryStat = {
  value: "9 in 10",
  label: "consumers read online reviews before choosing a local business",
  source: "BrightLocal, Local Consumer Review Survey",
};

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
        title: "Facebook Photo Shares",
        description:
          "Offer 10% off the next visit for a Facebook post featuring your restaurant. Diners' posts reach their friends and spread word-of-mouth far beyond your regulars.",
        platform: "Facebook",
        action: "Post a photo with your tag",
      },
      {
        title: "Instagram Food Posts",
        description:
          "A free appetizer for tagging your restaurant in an Instagram post. A tagged food photo puts your restaurant in front of the diner's friends — the people most likely to visit next.",
        platform: "Instagram",
        action: "Post a photo with tag",
      },
      {
        title: "TikTok Video Reviews",
        description:
          "Offer a complimentary dessert for a TikTok video. A short video review shows your food in motion and reaches followers who haven't found you yet.",
        platform: "TikTok",
        action: "Post a video review",
      },
    ],
    stats: [
      { label: "Paid-ad spend to reach your diners' friends", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Pin & Return",
        platform: "Pinterest",
        action: "Pin a photo of your meal",
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
        title: "Morning Routine Reels",
        description:
          "A free size upgrade for a TikTok Reel of your morning coffee run. Customers broadcast their daily ritual to their local followers and put your shop in the feed.",
        platform: "TikTok",
        action: "Post a Reel tagging you",
      },
      {
        title: "Latte Art Stories",
        description:
          "Free cookie with any Instagram Story featuring your latte art. A real customer's Story reaches their friends with a recommendation that lands harder than any ad.",
        platform: "Instagram",
        action: "Share a Story with tag",
      },
      {
        title: "Coffee Feature Post",
        description:
          "10% off for a Facebook post about your order. Word-of-mouth posts from real regulars carry more weight with their friends than any ad.",
        platform: "Facebook",
        action: "Post a photo tagging you",
      },
    ],
    stats: [
      { label: "Ad budget needed to grow by word of mouth", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Morning Buzz",
        platform: "TikTok",
        action: "Post a Reel tagging you",
        reward: "Free size upgrade",
      },
      {
        name: "Latte Art Share",
        platform: "Instagram",
        action: "Post a Story with location tag",
        reward: "Free cookie or pastry",
      },
      {
        name: "Coffee Feature",
        platform: "Facebook",
        action: "Post a photo tagging you",
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
          "Offer $10 off the next appointment for an Instagram before-and-after post. Before-and-after photos are eye-catching, shareable content that shows off your work to the client's whole network.",
        platform: "Instagram",
        action: "Post a before & after photo",
      },
      {
        title: "Fresh Look Feature",
        description:
          "A free deep conditioning treatment for a Facebook post showing off the new style. Client photos put your work in front of their whole friends list.",
        platform: "Facebook",
        action: "Post a photo tagging the salon",
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
      { label: "Paid-ad spend to reach your clients' friends", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Glow Up Share",
        platform: "Instagram",
        action: "Post a before & after with tag",
        reward: "$10 off next appointment",
      },
      {
        name: "Star Stylist",
        platform: "TikTok",
        action: "Post a Reel tagging your stylist",
        reward: "Free conditioning treatment",
      },
      {
        name: "Friend Referral",
        platform: "Instagram",
        action: "Share a referral Story",
        reward: "15% off for both",
      },
    ],
    relatedIndustries: ["nail-salons", "barbershops", "spas", "boutiques", "tattoo-shops"],
  },
  {
    slug: "nail-salons",
    name: "Nail Salons",
    headline: "Every Fresh Set Is a Post Waiting to Happen",
    subheadline:
      "Your clients already photograph their nails. Turn those photos into bookings by getting them tagged.",
    description:
      "Social Perks helps nail salons get more bookings through client-powered social media. Reward manicure photos, nail-art Reels, and referrals.",
    icon: "💅",
    useCases: [
      {
        title: "Fresh Set Share",
        description:
          "Offer $8 off the next fill for an Instagram photo of the finished set. Nail content is among the most-saved categories on social.",
        platform: "Instagram",
        action: "Post a photo of your new nails",
      },
      {
        title: "Nail Art Reel",
        description:
          "A free art add-on for a TikTok or Reel of the design process. Satisfying nail-art videos consistently rack up views and shares.",
        platform: "TikTok",
        action: "Post a nail-art process video",
      },
      {
        title: "Friend Referral",
        description:
          "Both the referrer and friend get 15% off when they share a referral link on their Instagram Story.",
        platform: "Instagram",
        action: "Share referral link in Story",
      },
    ],
    stats: [
      { label: "Paid-ad spend to reach your clients' friends", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Fresh Set Share",
        platform: "Instagram",
        action: "Post a photo of your set with tag",
        reward: "$8 off next fill",
      },
      {
        name: "Nail Art Reel",
        platform: "TikTok",
        action: "Post a nail-art process Reel",
        reward: "Free art add-on",
      },
      {
        name: "Friend Referral",
        platform: "Instagram",
        action: "Share a referral Story",
        reward: "15% off for both",
      },
    ],
    relatedIndustries: ["salons", "spas", "boutiques", "barbershops"],
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
          "A free beard trim for an Instagram post showing off the cut. A fresh-cut photo is an easy, natural post — and it puts your shop in front of the client's friends.",
        platform: "Instagram",
        action: "Post a photo of your fresh cut",
      },
      {
        title: "Fresh Cut Feature",
        description:
          "Free product sample for a Facebook post showing off the finished look. Client posts put your shop in front of their friends and neighbors.",
        platform: "Facebook",
        action: "Post a photo tagging the shop",
      },
      {
        title: "TikTok Transformation",
        description:
          "$5 off the next cut for a TikTok before-and-after video. Before-and-after cut videos are naturally shareable and reach people beyond your regulars.",
        platform: "TikTok",
        action: "Post a transformation video",
      },
    ],
    stats: [
      { label: "Ad spend to turn a fresh cut into new clients", value: "$0" },
      { label: "Rewards pay out only after a verified post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Clean Cut Share",
        platform: "Instagram",
        action: "Post a selfie with tag",
        reward: "Free beard trim next visit",
      },
      {
        name: "Pin Your Style",
        platform: "Pinterest",
        action: "Pin a photo of your cut",
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
          "One free month for sharing a transformation story on Instagram. A real member's story is far more convincing to their friends than any stock-photo ad.",
        platform: "Instagram",
        action: "Post a transformation story",
      },
      {
        title: "Buddy Referral",
        description:
          "Both friends get two weeks free when someone shares a referral link. People are more likely to stick with a gym when a friend joins them.",
        platform: "Instagram",
        action: "Share referral link",
      },
    ],
    stats: [
      { label: "Paid-ad spend to reach your members' networks", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
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
        title: "Mindful Moment Reel",
        description:
          "One free class for a Reel from your practice. Authentic student clips spread your studio's vibe to new local followers.",
        platform: "TikTok",
        action: "Post a Reel from class",
      },
      {
        title: "Bring a Friend",
        description:
          "Free class for both when a student shares a referral link. Students who bring a friend tend to show up more consistently — and bring the studio new faces.",
        platform: "Facebook",
        action: "Share event or referral link",
      },
    ],
    stats: [
      { label: "Ad budget to fill classes by word of mouth", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Namaste & Share",
        platform: "Instagram",
        action: "Post a Story from class with tag",
        reward: "Free mat rental for a week",
      },
      {
        name: "Mindful Moment Pin",
        platform: "Pinterest",
        action: "Pin a photo from your practice",
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
        title: "Post-Visit Smile Story",
        description:
          "Free whitening strips for posting a fresh-smile Story tagging the practice. Real patient posts spread through their followers and build word-of-mouth faster than any ad.",
        platform: "Instagram",
        action: "Share a Story tagging the practice",
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
          "$25 credit for both parties when a patient tags a family member in a post about the practice. Patients referred by family and friends tend to be loyal, long-term patients.",
        platform: "TikTok",
        action: "Tag a family member in a post",
      },
    ],
    stats: [
      { label: "Paid-ad spend to earn patient referrals", value: "$0" },
      {
        label: "Incentivized reviews — blocked by design (Google & the FTC ban them)",
        value: "0",
      },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Happy Mouth Post",
        platform: "Instagram",
        action: "Post a photo tagging the practice",
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
        platform: "Pinterest",
        action: "Pin a post tagging a family member",
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
          "Free dental treat bag for an Instagram post with your clinic tagged. Pet photos are some of the most-shared content online — an easy, natural post for pet parents.",
        platform: "Instagram",
        action: "Post a photo of your pet at the clinic",
      },
      {
        title: "Pet Reel Feature",
        description:
          "10% off next visit for a TikTok Reel of your pet's visit tagging the clinic. Short pet videos spread fast and put your clinic in front of local pet parents.",
        platform: "TikTok",
        action: "Post a Reel tagging the clinic",
      },
      {
        title: "New Pet Parent Referral",
        description:
          "$20 off for both when a client refers a new pet parent. Word-of-mouth from other pet parents is one of the strongest ways new clients find a clinic.",
        platform: "Facebook",
        action: "Share a referral post",
      },
    ],
    stats: [
      { label: "Ad spend to reach fellow pet parents", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Healthy Paws Post",
        platform: "Instagram",
        action: "Post a pet photo with clinic tag",
        reward: "Free dental treat bag",
      },
      {
        name: "Pet Parent Pin",
        platform: "Pinterest",
        action: "Pin a photo of your pet's visit",
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
        title: "Trust Builder Post",
        description:
          "Free tire rotation for an Instagram photo of the finished job tagging your shop. In auto repair, seeing real work from real customers is what earns a new driver's trust.",
        platform: "Instagram",
        action: "Post a photo with your tag",
      },
      {
        title: "Nextdoor Recommendation",
        description:
          "$10 off next service for a Nextdoor recommendation. Hyperlocal recommendations reach nearby drivers deciding where to take their car.",
        platform: "Nextdoor",
        action: "Write a recommendation",
      },
      {
        title: "Neighbor Referral",
        description:
          "Free oil change for both when a customer refers a neighbor. A neighbor's recommendation is the kind of word-of-mouth people trust most.",
        platform: "Facebook",
        action: "Share referral post to local groups",
      },
    ],
    stats: [
      { label: "Paid-ad spend to earn new drivers' trust", value: "$0" },
      {
        label: "Incentivized reviews — blocked by design (Google & the FTC ban them)",
        value: "0",
      },
      BRIGHTLOCAL_REVIEWS,
    ],
    templateSuggestions: [
      {
        name: "Show the Work",
        platform: "Instagram",
        action: "Post a photo with your tag",
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
          "$50 gift card for a 'Just sold' Instagram post tagging the agent. Closing-day posts reach friends who are house-hunting themselves.",
        platform: "Instagram",
        action: "Post a closing day photo with tag",
      },
      {
        title: "Neighborhood Tour Reel",
        description:
          "Professional home staging consultation for a TikTok tour of their new neighborhood, tagging the agent. Local tour content spreads fast through friends who are house-hunting nearby.",
        platform: "TikTok",
        action: "Post a neighborhood tour Reel with tag",
      },
      {
        title: "Homeowner Referral",
        description:
          "$200 referral bonus when a past client sends a buyer who closes. Referrals from past clients are among an agent's warmest, highest-intent leads.",
        platform: "Facebook",
        action: "Share referral link or tag in post",
      },
    ],
    stats: [
      { label: "Ad spend to turn closings into referrals", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Closing Day Share",
        platform: "Instagram",
        action: "Post a sold/closing photo with tag",
        reward: "$50 gift card",
      },
      {
        name: "Agent Shoutout Story",
        platform: "Pinterest",
        action: "Pin their new home tagging the agent",
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
          "Free late checkout for an Instagram post with the hotel tagged. Travel photos reach the guest's friends — many of them planning trips of their own.",
        platform: "Instagram",
        action: "Post a photo from the hotel with tag",
      },
      {
        title: "Room With a View Reel",
        description:
          "Complimentary breakfast for a TikTok Reel from their stay tagging the hotel. Travel content spreads fast — a guest's clip reaches friends already planning trips.",
        platform: "TikTok",
        action: "Post a Reel tagging the hotel",
      },
      {
        title: "Group Booking Share",
        description:
          "10% off group rates when guests share an event booking link. Event and group referrals can turn one booking into many.",
        platform: "Facebook",
        action: "Share event booking page",
      },
    ],
    stats: [
      { label: "Paid-ad spend to reach your guests' networks", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      BRIGHTLOCAL_REVIEWS,
    ],
    templateSuggestions: [
      {
        name: "Check-In & Share",
        platform: "Instagram",
        action: "Post a photo with hotel tag",
        reward: "Free late checkout",
      },
      {
        name: "Guest Feature",
        platform: "Pinterest",
        action: "Pin a photo tagging the hotel",
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
          "15% off next purchase for an Instagram haul post. Haul posts show real products on real people and reach the shopper's friends.",
        platform: "Instagram",
        action: "Post a shopping haul with tag",
      },
      {
        title: "Facebook Find Share",
        description:
          "Free gift with next purchase for a Facebook post about your find. Shoppers' posts put your store in front of their whole friends list.",
        platform: "Facebook",
        action: "Post a photo with your tag",
      },
      {
        title: "Pinterest Product Pin",
        description:
          "$5 store credit for pinning a product to Pinterest. Pinterest is a discovery platform where shoppers actively look for products to buy.",
        platform: "Pinterest",
        action: "Pin a product from the store",
      },
    ],
    stats: [
      { label: "Ad spend to reach your shoppers' friends", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Shopping Haul",
        platform: "Instagram",
        action: "Post a haul photo with store tag",
        reward: "15% off next purchase",
      },
      {
        name: "Shop Local Share",
        platform: "TikTok",
        action: "Post a Reel",
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
          "Free aromatherapy upgrade for an Instagram Story from the spa. Wellness and self-care posts are popular, shareable content that reaches new local audiences.",
        platform: "Instagram",
        action: "Share a Story with location tag",
      },
      {
        title: "Relaxation Reel",
        description:
          "$15 off next visit for a TikTok Reel from your visit. Wellness and self-care content travels fast, putting your spa in front of new local audiences.",
        platform: "TikTok",
        action: "Post a Reel tagging you",
      },
      {
        title: "Couples Referral",
        description:
          "Free add-on service for both when a client refers a friend. A friend's recommendation is one of the most reliable ways new clients book.",
        platform: "Facebook",
        action: "Share referral post or tag a friend",
      },
    ],
    stats: [
      { label: "Paid-ad spend to reach your clients' networks", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Spa Day Share",
        platform: "Instagram",
        action: "Post a Story with location tag",
        reward: "Free aromatherapy upgrade",
      },
      {
        name: "Wellness Pin",
        platform: "Pinterest",
        action: "Pin a photo tagging you",
        reward: "$15 off next visit",
      },
      {
        name: "Treat a Friend",
        platform: "Facebook",
        action: "Refer a friend via social",
        reward: "Free add-on service for both",
      },
    ],
    relatedIndustries: ["nail-salons", "salons", "yoga-studios", "hotels", "gyms"],
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
          "Free cookie with next purchase for an Instagram post. Beautiful baked goods are naturally photogenic — an easy, shareable post for customers.",
        platform: "Instagram",
        action: "Post a photo of your order with tag",
      },
      {
        title: "Sweet Share",
        description:
          "10% off next order for a Facebook post. A friend's photo of your treats spreads word-of-mouth to their whole local network.",
        platform: "Facebook",
        action: "Post a photo of your order tagging you",
      },
      {
        title: "Birthday Cake Referral",
        description:
          "Free cupcakes for both when a customer refers someone for a custom cake order. Custom cake orders are high-value — worth rewarding a referral for.",
        platform: "Instagram",
        action: "Tag a friend in a post or Story",
      },
    ],
    stats: [
      { label: "Ad budget to grow by word of mouth", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Sweet Shot",
        platform: "Instagram",
        action: "Post a photo of your order with tag",
        reward: "Free cookie",
      },
      {
        name: "Baker's Reel",
        platform: "TikTok",
        action: "Post a Reel featuring your order",
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
        title: "Taproom Photo Post",
        description:
          "Free tasting flight for an Instagram photo from the taproom tagging you. A beer lover's post reaches their friends and puts your brewery on the local map.",
        platform: "Instagram",
        action: "Post a photo with your tag",
      },
      {
        title: "Flight Photo Post",
        description:
          "Free pint of the brewer's choice for a TikTok post of your tasting flight. Flight videos spread your taproom to beer lovers across the region through word-of-mouth.",
        platform: "TikTok",
        action: "Post a video of your flight tagging us",
      },
      {
        title: "Event Hype Share",
        description:
          "Free first beer at the event for sharing an event post. Event shares from regulars fill your taproom by reaching their friends directly.",
        platform: "Facebook",
        action: "Share an event post",
      },
    ],
    stats: [
      { label: "Paid-ad spend to fill your taproom", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Tap & Tag",
        platform: "Instagram",
        action: "Post a photo with brewery tag",
        reward: "Free tasting flight",
      },
      {
        name: "Pint-Sized Pin",
        platform: "Pinterest",
        action: "Pin a photo of your beer tagging us",
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
          "$5 off next order for an Instagram post. Flowers are some of the most-photographed gifts — a natural, beautiful post to share.",
        platform: "Instagram",
        action: "Post a photo of your arrangement with tag",
      },
      {
        title: "Wedding Vendor Pin",
        description:
          "Free boutonniere with next wedding order for a Pinterest post. Pinned wedding arrangements keep your work in front of couples planning their big day.",
        platform: "Pinterest",
        action: "Post a pin of your arrangement tagging you",
      },
      {
        title: "Gift Referral",
        description:
          "Free delivery for both when a recipient refers the sender. A flower recipient is a warm new customer — reward the introduction.",
        platform: "Instagram",
        action: "Tag the sender and the florist in a post",
      },
    ],
    stats: [
      { label: "Ad spend to reach your customers' friends", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Petal Post",
        platform: "Instagram",
        action: "Post a photo of your flowers with tag",
        reward: "$5 off next order",
      },
      {
        name: "Bloom Share",
        platform: "Facebook",
        action: "Share a photo of your flowers tagging you",
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
        title: "Behind-the-Scenes Feature",
        description:
          "Free mini session for a Facebook post featuring a favorite shot from their session and tagging your studio. Client posts put your work in front of local friends who are planning their own shoots.",
        platform: "Facebook",
        action: "Post a favorite session photo tagging you",
      },
      {
        title: "Engagement Session Referral",
        description:
          "$50 print credit for both when a client refers someone who books. Referred clients arrive already trusting your work — reward the introduction.",
        platform: "Instagram",
        action: "Tag a friend in a Story or post",
      },
    ],
    stats: [
      { label: "Paid-ad spend to turn galleries into bookings", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Gallery Share",
        platform: "Instagram",
        action: "Share a session photo with tag",
        reward: "Free 8x10 print",
      },
      {
        name: "Portfolio Feature",
        platform: "TikTok",
        action: "Post a Reel featuring your session photos",
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
          "$15 off next session for an Instagram post showing their new tattoo. A fresh-ink reveal is naturally eye-catching content that reaches the client's followers.",
        platform: "Instagram",
        action: "Post a photo of new tattoo with shop tag",
      },
      {
        title: "Artist Spotlight Reel",
        description:
          "Free touch-up for a TikTok Reel showing off the artist's work on your fresh ink. Naming the artist in your post helps build their following and books their calendar out further.",
        platform: "TikTok",
        action: "Post a Reel tagging your artist",
      },
      {
        title: "Flash Day Referral",
        description:
          "Priority booking for both on flash days when a client refers a friend. Social promotion helps flash events fill up by reaching people beyond your regulars.",
        platform: "Instagram",
        action: "Tag a friend in a flash event post",
      },
    ],
    stats: [
      { label: "Ad spend to turn fresh ink into bookings", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Fresh Ink Reveal",
        platform: "Instagram",
        action: "Post a photo of your new tattoo with tag",
        reward: "$15 off next session",
      },
      {
        name: "Artist Shoutout",
        platform: "Facebook",
        action: "Share a photo post tagging your artist",
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
          "Free treat bag for an Instagram Reel of their pet with a new toy. Pet photos and unboxings are fun, shareable content that reaches other pet parents.",
        platform: "Instagram",
        action: "Post a Reel of your pet with a store purchase",
      },
      {
        title: "Pet TikTok Feature",
        description:
          "10% off next purchase for a TikTok post featuring your store. Local pet stores earn word-of-mouth reach that pulls pet parents away from big chains.",
        platform: "TikTok",
        action: "Post a TikTok tagging the store",
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
      { label: "Paid-ad spend to compete with the big chains", value: "$0" },
      { label: "FTC disclosure added to every post", value: "Automatic" },
      BRIGHTLOCAL_REVIEWS,
    ],
    templateSuggestions: [
      {
        name: "Happy Pet Post",
        platform: "Instagram",
        action: "Post a photo/Reel of your pet with store tag",
        reward: "Free treat bag",
      },
      {
        name: "Local Love Pin",
        platform: "Pinterest",
        action: "Pin a photo of your pet with a store purchase",
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
          "15% off next purchase for an outfit-of-the-day Instagram post. Outfit posts show your pieces on real people and reach the shopper's friends.",
        platform: "Instagram",
        action: "Post an OOTD with boutique tag",
      },
      {
        title: "Hidden Gem Reel",
        description:
          "Free accessory with next purchase for a TikTok Reel showing off a boutique find. 'Hidden gem' discovery videos spread by word-of-mouth and pull in first-time visitors.",
        platform: "TikTok",
        action: "Post a Reel featuring a boutique find",
      },
      {
        title: "Style Share Referral",
        description:
          "$10 credit for both when a customer refers a friend. A friend's style recommendation converts far better than a cold ad.",
        platform: "Instagram",
        action: "Send a referral link via DM or Story",
      },
    ],
    stats: [
      { label: "Ad spend to reach your customers' friends", value: "$0" },
      { label: "Every reward pays out only after a real post", value: "Verified" },
      NIELSEN_TRUST,
    ],
    templateSuggestions: [
      {
        name: "Style Share",
        platform: "Instagram",
        action: "Post an outfit photo with boutique tag",
        reward: "15% off next purchase",
      },
      {
        name: "Boutique Find Feature",
        platform: "Facebook",
        action: "Post a photo of a boutique find with your tag",
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
