import { Platform, Action, ActionCategory, FollowerTier, AgentEvent, TierMeta } from "./types";

// ═══════════════ 25 Platforms, 125 Actions ═══════════════

export const PLATFORMS: Platform[] = [
  { id: "ig", name: "Instagram", icon: "📸", color: "#E1306C", actions: [
    { id: "ig_st", label: "Story Tag", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "ig_sl", label: "Story Location", type: "content", effort: 1, value: 1.2, incentivizable: true },
    { id: "ig_sp", label: "Story Poll", type: "content", effort: 2, value: 2, incentivizable: true },
    { id: "ig_fp", label: "Feed Photo", type: "content", effort: 2, value: 2.5, incentivizable: true },
    { id: "ig_fc", label: "Carousel", type: "content", effort: 3, value: 3.5, incentivizable: true },
    { id: "ig_rl", label: "Reel", type: "content", effort: 3, value: 4, incentivizable: true },
    { id: "ig_cb", label: "Collab Post", type: "content", effort: 3, value: 5, incentivizable: true },
    { id: "ig_lv", label: "Live Mention", type: "content", effort: 2, value: 3, incentivizable: true },
    { id: "ig_gd", label: "Guide", type: "content", effort: 3, value: 3.5, incentivizable: true },
    { id: "ig_hl", label: "Highlight", type: "content", effort: 1, value: 2, incentivizable: true },
    { id: "ig_fo", label: "Follow", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "ig_lk", label: "Like", type: "engage", effort: 0, value: 0.1, incentivizable: true },
    { id: "ig_cm", label: "Comment", type: "engage", effort: 1, value: 0.8, incentivizable: true },
    { id: "ig_sv", label: "Save", type: "engage", effort: 0, value: 0.5, incentivizable: true },
    { id: "ig_sd", label: "Share DM", type: "share", effort: 1, value: 1, incentivizable: true },
    { id: "ig_ss", label: "Share Story", type: "share", effort: 1, value: 1.5, incentivizable: true },
  ]},
  { id: "tt", name: "TikTok", icon: "🎬", color: "#00F2EA", actions: [
    { id: "tt_vd", label: "Video", type: "content", effort: 3, value: 3.5, incentivizable: true },
    { id: "tt_rv", label: "Review Video", type: "content", effort: 3, value: 4, incentivizable: true },
    { id: "tt_du", label: "Duet", type: "content", effort: 2, value: 3, incentivizable: true },
    { id: "tt_st", label: "Stitch", type: "content", effort: 2, value: 3, incentivizable: true },
    { id: "tt_ph", label: "Photo Post", type: "content", effort: 2, value: 2.5, incentivizable: true },
    { id: "tt_fo", label: "Follow", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "tt_lk", label: "Like", type: "engage", effort: 0, value: 0.1, incentivizable: true },
    { id: "tt_cm", label: "Comment", type: "engage", effort: 1, value: 0.5, incentivizable: true },
    { id: "tt_sh", label: "Share", type: "share", effort: 1, value: 1, incentivizable: true },
  ]},
  { id: "go", name: "Google", icon: "⭐", color: "#FBBC04", actions: [
    { id: "go_rv", label: "Review", type: "review", effort: 2, value: 5, incentivizable: false },
    { id: "go_rd", label: "Detailed Review", type: "review", effort: 3, value: 8, incentivizable: false },
    { id: "go_rp", label: "Review + Photos", type: "review", effort: 3, value: 10, incentivizable: false },
    { id: "go_ph", label: "Photos", type: "content", effort: 1, value: 2, incentivizable: true },
    { id: "go_qa", label: "Answer Q&A", type: "engage", effort: 1, value: 1.5, incentivizable: true },
  ]},
  { id: "fb", name: "Facebook", icon: "👍", color: "#1877F2", actions: [
    { id: "fb_po", label: "Post", type: "content", effort: 2, value: 1.5, incentivizable: true },
    { id: "fb_sy", label: "Story", type: "content", effort: 1, value: 1, incentivizable: true },
    { id: "fb_rl", label: "Reel", type: "content", effort: 3, value: 3, incentivizable: true },
    { id: "fb_ci", label: "Check-in", type: "engage", effort: 0, value: 0.5, incentivizable: true },
    { id: "fb_cp", label: "Check-in Post", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "fb_rc", label: "Recommendation", type: "review", effort: 2, value: 4, incentivizable: true },
    { id: "fb_lp", label: "Like Page", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "fb_fw", label: "Follow", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "fb_sh", label: "Share", type: "share", effort: 1, value: 1, incentivizable: true },
    { id: "fb_cm", label: "Comment", type: "engage", effort: 1, value: 0.5, incentivizable: true },
    { id: "fb_ev", label: "RSVP Event", type: "engage", effort: 0, value: 0.5, incentivizable: true },
    { id: "fb_gr", label: "Group Post", type: "content", effort: 2, value: 3, incentivizable: true },
    { id: "fb_tg", label: "Tag Friends", type: "share", effort: 1, value: 1, incentivizable: true },
  ]},
  { id: "xw", name: "X", icon: "✍️", color: "#1DA1F2", actions: [
    { id: "xw_po", label: "Post", type: "content", effort: 1, value: 1, incentivizable: true },
    { id: "xw_pp", label: "Post + Photo", type: "content", effort: 2, value: 1.5, incentivizable: true },
    { id: "xw_pv", label: "Post + Video", type: "content", effort: 3, value: 2.5, incentivizable: true },
    { id: "xw_th", label: "Thread", type: "content", effort: 3, value: 3, incentivizable: true },
    { id: "xw_rp", label: "Repost", type: "share", effort: 0, value: 0.5, incentivizable: true },
    { id: "xw_qt", label: "Quote", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "xw_fo", label: "Follow", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "xw_lk", label: "Like", type: "engage", effort: 0, value: 0.1, incentivizable: true },
    { id: "xw_ry", label: "Reply", type: "engage", effort: 1, value: 0.5, incentivizable: true },
  ]},
  { id: "yt", name: "YouTube", icon: "📺", color: "#FF0000", actions: [
    { id: "yt_sh", label: "Short", type: "content", effort: 3, value: 4, incentivizable: true },
    { id: "yt_vd", label: "Video", type: "content", effort: 4, value: 8, incentivizable: true },
    { id: "yt_rv", label: "Full Review", type: "content", effort: 5, value: 12, incentivizable: true },
    { id: "yt_sb", label: "Subscribe", type: "engage", effort: 0, value: 0.5, incentivizable: true },
    { id: "yt_lk", label: "Like", type: "engage", effort: 0, value: 0.1, incentivizable: true },
    { id: "yt_cm", label: "Comment", type: "engage", effort: 1, value: 0.5, incentivizable: true },
  ]},
  { id: "yp", name: "Yelp", icon: "🔴", color: "#D32323", actions: [
    { id: "yp_rv", label: "Review", type: "review", effort: 2, value: 5, incentivizable: false },
    { id: "yp_rp", label: "Review + Photos", type: "review", effort: 3, value: 8, incentivizable: false },
    { id: "yp_ph", label: "Photos", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "yp_ci", label: "Check-in", type: "engage", effort: 0, value: 0.3, incentivizable: true },
  ]},
  { id: "li", name: "LinkedIn", icon: "💼", color: "#0A66C2", actions: [
    { id: "li_po", label: "Post", type: "content", effort: 2, value: 2.5, incentivizable: true },
    { id: "li_ar", label: "Article", type: "content", effort: 4, value: 5, incentivizable: true },
    { id: "li_sh", label: "Share", type: "share", effort: 1, value: 1, incentivizable: true },
    { id: "li_fo", label: "Follow", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "li_cm", label: "Comment", type: "engage", effort: 1, value: 0.5, incentivizable: true },
  ]},
  { id: "pi", name: "Pinterest", icon: "📌", color: "#E60023", actions: [
    { id: "pi_ph", label: "Pin Photo", type: "content", effort: 2, value: 1.5, incentivizable: true },
    { id: "pi_vd", label: "Pin Video", type: "content", effort: 3, value: 2.5, incentivizable: true },
    { id: "pi_id", label: "Idea Pin", type: "content", effort: 3, value: 3, incentivizable: true },
    { id: "pi_sv", label: "Save", type: "engage", effort: 0, value: 0.3, incentivizable: true },
    { id: "pi_fo", label: "Follow", type: "engage", effort: 0, value: 0.2, incentivizable: true },
  ]},
  { id: "nd", name: "Nextdoor", icon: "🏘️", color: "#8ED500", actions: [
    { id: "nd_rc", label: "Recommendation", type: "review", effort: 2, value: 4, incentivizable: true },
    { id: "nd_po", label: "Post", type: "content", effort: 2, value: 3, incentivizable: true },
    { id: "nd_ev", label: "Share Event", type: "share", effort: 1, value: 1.5, incentivizable: true },
  ]},
  { id: "th", name: "Threads", icon: "🧵", color: "#999999", actions: [
    { id: "th_po", label: "Post", type: "content", effort: 1, value: 1, incentivizable: true },
    { id: "th_pp", label: "Photo Post", type: "content", effort: 2, value: 1.5, incentivizable: true },
    { id: "th_rp", label: "Repost", type: "share", effort: 0, value: 0.5, incentivizable: true },
    { id: "th_fo", label: "Follow", type: "engage", effort: 0, value: 0.2, incentivizable: true },
  ]},
  { id: "sc", name: "Snapchat", icon: "👻", color: "#FFFC00", actions: [
    { id: "sc_sn", label: "Location Snap", type: "content", effort: 1, value: 1, incentivizable: true },
    { id: "sc_sy", label: "Story", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "sc_sp", label: "Spotlight", type: "content", effort: 3, value: 3, incentivizable: true },
  ]},
  { id: "ta", name: "TripAdvisor", icon: "🦉", color: "#00AA6C", actions: [
    { id: "ta_rv", label: "Review", type: "review", effort: 2, value: 5, incentivizable: false },
    { id: "ta_rp", label: "Review + Photos", type: "review", effort: 3, value: 8, incentivizable: false },
  ]},
  { id: "rd", name: "Reddit", icon: "🤖", color: "#FF4500", actions: [
    { id: "rd_po", label: "Post", type: "content", effort: 2, value: 2.5, incentivizable: true },
    { id: "rd_cm", label: "Comment Rec", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "rd_up", label: "Upvote", type: "engage", effort: 0, value: 0.2, incentivizable: true },
  ]},
  { id: "rf", name: "Referral", icon: "🤝", color: "#8B5CF6", actions: [
    { id: "rf_fr", label: "Friend Referral", type: "referral", effort: 2, value: 8, incentivizable: true },
    { id: "rf_ip", label: "Bring In Person", type: "referral", effort: 2, value: 10, incentivizable: true },
    { id: "rf_gc", label: "Group Chat", type: "share", effort: 1, value: 2, incentivizable: true },
    { id: "rf_em", label: "Email Forward", type: "share", effort: 1, value: 1.5, incentivizable: true },
  ]},
  { id: "wa", name: "WhatsApp", icon: "💬", color: "#25D366", actions: [
    { id: "wa_st", label: "Status Post", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "wa_sh", label: "Share to Group", type: "share", effort: 1, value: 2, incentivizable: true },
    { id: "wa_bc", label: "Broadcast Share", type: "share", effort: 1, value: 2.5, incentivizable: true },
    { id: "wa_rf", label: "Forward to Friend", type: "referral", effort: 1, value: 3, incentivizable: true },
  ]},
  { id: "tg", name: "Telegram", icon: "✈️", color: "#26A5E4", actions: [
    { id: "tg_po", label: "Channel Post", type: "content", effort: 2, value: 2, incentivizable: true },
    { id: "tg_sh", label: "Share to Group", type: "share", effort: 1, value: 1.5, incentivizable: true },
    { id: "tg_rv", label: "Bot Review", type: "review", effort: 2, value: 3, incentivizable: true },
  ]},
  { id: "dc", name: "Discord", icon: "🎮", color: "#5865F2", actions: [
    { id: "dc_po", label: "Server Post", type: "content", effort: 1, value: 1.5, incentivizable: true },
    { id: "dc_rv", label: "Channel Review", type: "review", effort: 2, value: 2.5, incentivizable: true },
    { id: "dc_sh", label: "Share Link", type: "share", effort: 1, value: 1, incentivizable: true },
  ]},
  { id: "tw", name: "Twitch", icon: "🎮", color: "#9146FF", actions: [
    { id: "tw_mn", label: "Stream Mention", type: "content", effort: 2, value: 4, incentivizable: true },
    { id: "tw_rv", label: "Live Review", type: "content", effort: 3, value: 6, incentivizable: true },
    { id: "tw_cl", label: "Clip", type: "content", effort: 2, value: 3, incentivizable: true },
    { id: "tw_fo", label: "Follow", type: "engage", effort: 0, value: 0.3, incentivizable: true },
  ]},
  { id: "tm", name: "Tumblr", icon: "📝", color: "#36465D", actions: [
    { id: "tm_po", label: "Blog Post", type: "content", effort: 2, value: 2, incentivizable: true },
    { id: "tm_ph", label: "Photo Post", type: "content", effort: 2, value: 1.5, incentivizable: true },
    { id: "tm_rb", label: "Reblog", type: "share", effort: 0, value: 0.5, incentivizable: true },
  ]},
  { id: "br", name: "BeReal", icon: "📷", color: "#000000", actions: [
    { id: "br_po", label: "BeReal Post", type: "content", effort: 1, value: 2, incentivizable: true },
    { id: "br_cm", label: "RealMoji", type: "engage", effort: 0, value: 0.5, incentivizable: true },
  ]},
  { id: "l8", name: "Lemon8", icon: "🍋", color: "#FFE135", actions: [
    { id: "l8_po", label: "Post", type: "content", effort: 2, value: 2, incentivizable: true },
    { id: "l8_rv", label: "Review Post", type: "review", effort: 2, value: 3, incentivizable: true },
    { id: "l8_fo", label: "Follow", type: "engage", effort: 0, value: 0.2, incentivizable: true },
  ]},
  { id: "bs", name: "Bluesky", icon: "🦋", color: "#0085FF", actions: [
    { id: "bs_po", label: "Post", type: "content", effort: 1, value: 1, incentivizable: true },
    { id: "bs_pp", label: "Post + Photo", type: "content", effort: 2, value: 1.5, incentivizable: true },
    { id: "bs_rp", label: "Repost", type: "share", effort: 0, value: 0.5, incentivizable: true },
    { id: "bs_fo", label: "Follow", type: "engage", effort: 0, value: 0.2, incentivizable: true },
  ]},
  { id: "md", name: "Mastodon", icon: "🐘", color: "#6364FF", actions: [
    { id: "md_po", label: "Toot", type: "content", effort: 1, value: 1, incentivizable: true },
    { id: "md_bt", label: "Boost", type: "share", effort: 0, value: 0.5, incentivizable: true },
    { id: "md_fo", label: "Follow", type: "engage", effort: 0, value: 0.2, incentivizable: true },
  ]},
  { id: "gm", name: "Google Maps", icon: "📍", color: "#34A853", actions: [
    { id: "gm_rv", label: "Review", type: "review", effort: 2, value: 5, incentivizable: false },
    { id: "gm_rp", label: "Review + Photos", type: "review", effort: 3, value: 8, incentivizable: false },
    { id: "gm_ph", label: "Add Photos", type: "content", effort: 1, value: 2, incentivizable: true },
    { id: "gm_qa", label: "Answer Question", type: "engage", effort: 1, value: 1.5, incentivizable: true },
    { id: "gm_li", label: "Add to List", type: "engage", effort: 0, value: 1, incentivizable: true },
  ]},
];

// Flattened action list with platform metadata
export const ALL_ACTIONS: (Action & { platformId: string; platformName: string; platformIcon: string; platformColor: string })[] =
  PLATFORMS.flatMap(p =>
    p.actions.map(a => ({
      ...a,
      platformId: p.id,
      platformName: p.name,
      platformIcon: p.icon,
      platformColor: p.color,
    }))
  );

export const findAction = (id: string) => ALL_ACTIONS.find(a => a.id === id);
export const findPlatform = (id: string) => PLATFORMS.find(p => p.id === id);

export const ACTION_CATEGORIES: ActionCategory[] = [
  { id: "content", label: "Content", icon: "📸", color: "#E1306C" },
  { id: "review", label: "Reviews", icon: "⭐", color: "#FBBC04" },
  { id: "engage", label: "Engagement", icon: "👆", color: "#22D3EE" },
  { id: "share", label: "Sharing", icon: "📤", color: "#8B5CF6" },
  { id: "referral", label: "Referrals", icon: "🤝", color: "#10B981" },
];

export const FOLLOWER_TIERS: FollowerTier[] = [
  { label: "Anyone", minFollowers: 0, bonus: 0, color: "#636B8A" },
  { label: "500+", minFollowers: 500, bonus: 5, color: "#22D3EE" },
  { label: "2K+", minFollowers: 2000, bonus: 10, color: "#A78BFA" },
  { label: "10K+", minFollowers: 10000, bonus: 15, color: "#FBBF24" },
  { label: "50K+", minFollowers: 50000, bonus: 25, color: "#F472B6" },
];

export const TIER_META: Record<string, TierMeta> = {
  essential: { label: "Essential", color: "#34D399", icon: "◆" },
  high_impact: { label: "High Impact", color: "#FB923C", icon: "▲" },
  growth: { label: "Growth", color: "#22D3EE", icon: "●" },
  premium: { label: "Premium", color: "#F472B6", icon: "★" },
  starter: { label: "Starter", color: "#636B8A", icon: "○" },
};

export const AGENT_EVENTS: AgentEvent[] = [
  { agent: "Claude Marketing", action: "queried pricing", detail: "Instagram Reel for Yoga Studio", time: "2s ago" },
  { agent: "MarketBot AI", action: "launched campaign", detail: "Google Review Drive — Taqueria Sol", time: "15s ago" },
  { agent: "BizGrowth Agent", action: "searched influencers", detail: "niche=Food, min_followers=5000", time: "34s ago" },
  { agent: "Claude Marketing", action: "queried benchmark", detail: "Restaurant avg completion rate", time: "1m ago" },
  { agent: "GrowthHack AI", action: "executed campaign", detail: "TikTok Video — Iron Temple", time: "2m ago" },
  { agent: "MarketBot AI", action: "queried pricing", detail: "Yelp Review for Salon", time: "3m ago" },
  { agent: "Claude Marketing", action: "created campaign", detail: "Before/After — Glow Studio", time: "4m ago" },
  { agent: "BizGrowth Agent", action: "queried influencer rate", detail: "@priya.eats.dc content", time: "5m ago" },
];
