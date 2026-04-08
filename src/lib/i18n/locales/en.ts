// ══════════════════════════════════════════════════════════════════════════════
// English (en) — Default Locale
// ══════════════════════════════════════════════════════════════════════════════

import type { TranslationStrings } from "../index";

const en: TranslationStrings = {
  // ─── Navigation ──────────────────────────────────────────────────────────
  nav: {
    home: "Home",
    pricing: "Pricing",
    contact: "Contact",
    howItWorks: "How It Works",
    examples: "Examples",
    login: "Log In",
    signup: "Sign Up",
    getStarted: "Get Started",
    logout: "Log Out",
    dashboard: "Dashboard",
    campaigns: "Campaigns",
    earnings: "Earnings",
    profile: "Profile",
    settings: "Settings",
    discover: "Discover",
    analytics: "Analytics",
    wallet: "Wallet",
  },

  // ─── Hero / Landing ─────────────────────────────────────────────────────
  hero: {
    headline: "Turn Customers Into Your Marketing Team",
    subheadline:
      "Offer perks and discounts in exchange for social media posts, reviews, and referrals. Works for any business, any size.",
    cta: "Start Free Today",
    ctaSecondary: "See How It Works",
    trustedBy: "Trusted by {{count}} businesses",
  },

  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: {
    login: "Log In",
    signup: "Sign Up",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    resetPassword: "Reset Password",
    resetPasswordSuccess: "Check your email for reset instructions.",
    rememberMe: "Remember me",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    orContinueWith: "Or continue with",
    verifyEmail: "Verify Your Email",
    verifyEmailMessage: "We sent a verification link to {{email}}.",
    welcomeBack: "Welcome back, {{name}}!",
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: {
    title: "Dashboard",
    campaign: "Campaign",
    campaigns: "Campaigns",
    submission: "Submission",
    submissions: "Submissions",
    earnings: "Earnings",
    wallet: "Wallet",
    profile: "Profile",
    analytics: "Analytics",
    overview: "Overview",
    recentActivity: "Recent Activity",
    totalEarnings: "Total Earnings",
    activeCampaigns: "Active Campaigns",
    pendingReview: "Pending Review",
    completionRate: "Completion Rate",
  },

  // ─── Business Portal ─────────────────────────────────────────────────────
  business: {
    createCampaign: "Create Campaign",
    launchCampaign: "Launch Campaign",
    pauseCampaign: "Pause Campaign",
    resumeCampaign: "Resume Campaign",
    endCampaign: "End Campaign",
    editCampaign: "Edit Campaign",
    campaignName: "Campaign Name",
    campaignDescription: "Campaign Description",
    targetAudience: "Target Audience",
    budget: "Budget",
    duration: "Duration",
    perkValue: "Perk Value",
    requiredActions: "Required Actions",
    businessName: "Business Name",
    businessType: "Business Type",
    activeCampaigns: "Active Campaigns",
    totalCompletions: "Total Completions",
    revenueGenerated: "Revenue Generated",
    customerReach: "Customer Reach",
    selectPlatform: "Select Platform",
    campaignTier: "Campaign Tier",
    effortLevel: "Effort Level",
  },

  // ─── Influencer Portal ───────────────────────────────────────────────────
  influencer: {
    discover: "Discover Campaigns",
    submitProof: "Submit Proof",
    earnings: "My Earnings",
    cashOut: "Cash Out",
    proofUrl: "Proof URL",
    proofDescription: "Describe what you did",
    followers: "Followers",
    engagementRate: "Engagement Rate",
    tier: "Influencer Tier",
    rateCard: "Rate Card",
    portfolio: "Portfolio",
    pendingPayouts: "Pending Payouts",
    totalCashOuts: "Total Cash Outs",
    availableBalance: "Available Balance",
    completedCampaigns: "Completed Campaigns",
  },

  // ─── Pricing ─────────────────────────────────────────────────────────────
  pricing: {
    title: "Simple, Transparent Pricing",
    subtitle: "Start free and scale as you grow.",
    free: "Free",
    pro: "Pro",
    enterprise: "Enterprise",
    monthly: "Monthly",
    annual: "Annual",
    perMonth: "/month",
    billedAnnually: "Billed annually",
    currentPlan: "Current Plan",
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    contactSales: "Contact Sales",
    features: {
      unlimitedCampaigns: "Unlimited campaigns",
      advancedAnalytics: "Advanced analytics",
      prioritySupport: "Priority support",
      customBranding: "Custom branding",
      apiAccess: "API access",
      multiLocation: "Multi-location management",
      dedicatedManager: "Dedicated account manager",
      slaGuarantee: "SLA guarantee",
      basicAnalytics: "Basic analytics",
      upToThreeCampaigns: "Up to 3 campaigns",
      communitySupport: "Community support",
    },
  },

  // ─── Common ──────────────────────────────────────────────────────────────
  common: {
    loading: "Loading...",
    error: "An error occurred",
    success: "Success!",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    search: "Search",
    filter: "Filter",
    edit: "Edit",
    view: "View",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    confirm: "Confirm",
    retry: "Retry",
    noResults: "No results found",
    showMore: "Show more",
    showLess: "Show less",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    sortBy: "Sort by",
    ascending: "Ascending",
    descending: "Descending",
    yes: "Yes",
    no: "No",
    or: "or",
    and: "and",
    of: "of",
    to: "to",
    from: "from",
    all: "All",
    none: "None",
    welcome: "Welcome, {{name}}!",
  },

  // ─── Errors ──────────────────────────────────────────────────────────────
  errors: {
    requiredField: "This field is required",
    invalidEmail: "Please enter a valid email address",
    passwordTooShort: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    invalidUrl: "Please enter a valid URL",
    networkError: "Network error. Please check your connection.",
    serverError: "Server error. Please try again later.",
    unauthorized: "You are not authorized to perform this action.",
    notFound: "The requested resource was not found.",
    rateLimited: "Too many requests. Please wait a moment.",
    invalidAmount: "Please enter a valid amount",
    campaignFull: "This campaign has reached its participant limit.",
    alreadyEnrolled: "You are already enrolled in this campaign.",
    submissionFailed: "Submission failed. Please try again.",
    fileTooLarge: "File is too large. Maximum size is {{size}}.",
    invalidFileType: "Invalid file type. Allowed types: {{types}}.",
    sessionExpired: "Your session has expired. Please log in again.",
  },

  // ─── Email Subjects ──────────────────────────────────────────────────────
  email: {
    welcomeSubject: "Welcome to Social Perks!",
    submissionApproved: "Your submission has been approved!",
    submissionRejected: "Your submission needs changes",
    weeklyDigest: "Your weekly Social Perks digest",
    payoutProcessed: "Your payout has been processed",
    campaignLaunched: "Your campaign is live!",
    newSubmission: "New submission for your campaign",
    accountVerified: "Your account has been verified",
  },

  // ─── Perk / Wallet ──────────────────────────────────────────────────────
  perk: {
    earned: "Perk Earned",
    redeemed: "Redeemed",
    expired: "Expired",
    walletBalance: "Wallet Balance",
    redeemNow: "Redeem Now",
    history: "Transaction History",
    pending: "Pending",
  },

  // ─── Tiers ───────────────────────────────────────────────────────────────
  tiers: {
    essential: "Essential",
    highImpact: "High Impact",
    growth: "Growth",
    premium: "Premium",
    starter: "Starter",
  },

  // ─── Platforms ───────────────────────────────────────────────────────────
  platforms: {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    twitter: "X (Twitter)",
    facebook: "Facebook",
    google: "Google",
    yelp: "Yelp",
    linkedin: "LinkedIn",
  },

  // ─── Time / Date ─────────────────────────────────────────────────────────
  time: {
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: "{{count}} days ago",
    hoursAgo: "{{count}} hours ago",
    minutesAgo: "{{count}} minutes ago",
    justNow: "Just now",
  },

  // ─── Footer ──────────────────────────────────────────────────────────────
  footer: {
    product: "Product",
    company: "Company",
    resources: "Resources",
    legal: "Legal",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    helpCenter: "Help Center",
    blog: "Blog",
    about: "About",
    careers: "Careers",
    copyright: "All rights reserved.",
  },
};

export default en;
