/**
 * Platform API Adapters
 *
 * Real HTTP clients for each social media platform's API.
 * Each adapter knows how to query a platform for content verification:
 * - Does a post exist at this URL?
 * - Does it contain required hashtags/mentions?
 * - What are the engagement metrics?
 * - When was it posted?
 *
 * All adapters implement a common interface and handle platform-specific
 * response formats, error codes, and pagination.
 */

import type { OAuthManager } from "./oauth-manager";
import type { PlatformRateLimiter } from "./rate-limiter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContentData {
  /** Platform-native post/content ID. */
  contentId: string;
  /** URL to the content on the platform. */
  permalink: string;
  /** Content type: post, reel, story, video, review, etc. */
  contentType: string;
  /** Text content (caption, review text, tweet text, etc.). */
  textContent: string;
  /** When the content was created/posted. */
  createdAt: string;
  /** Author's platform user ID. */
  authorId: string;
  /** Author's display name. */
  authorName: string;
  /** Engagement metrics (platform-dependent). */
  metrics: ContentMetrics;
  /** Media URLs (images, videos). */
  mediaUrls: string[];
  /** Hashtags found in the content. */
  hashtags: string[];
  /** Mentions found in the content. */
  mentions: string[];
  /** Raw platform API response for audit purposes. */
  rawResponse: Record<string, unknown>;
}

export interface ContentMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  impressions: number;
  reach: number;
  engagementRate: number;
}

export interface VerificationCheck {
  /** Does the content exist? */
  exists: boolean;
  /** Does the author match the expected user? */
  authorMatch: boolean;
  /** Was it posted within the acceptable time window? */
  withinTimeWindow: boolean;
  /** Does it contain required hashtags? */
  hasRequiredHashtags: boolean;
  /** Does it contain required mentions? */
  hasRequiredMentions: boolean;
  /** Does it meet minimum engagement thresholds? */
  meetsEngagement: boolean;
  /** Overall confidence score (0-1). */
  confidence: number;
  /** Individual check details. */
  details: Record<string, unknown>;
}

export interface VerificationRequest {
  /** The proof URL or content identifier. */
  proofUrl: string;
  /** Expected author's platform user ID. */
  expectedAuthorId?: string;
  /** Required hashtags (case-insensitive). */
  requiredHashtags?: string[];
  /** Required mentions (without @). */
  requiredMentions?: string[];
  /** Content must be posted after this time. */
  postedAfter?: string;
  /** Content must be posted before this time. */
  postedBefore?: string;
  /** Minimum engagement metrics. */
  minMetrics?: Partial<ContentMetrics>;
}

export interface PlatformAdapter {
  readonly platformId: string;
  readonly platformName: string;

  /** Check if this adapter has valid credentials and can make API calls. */
  isAvailable(): boolean;

  /** Extract a content ID from a proof URL. */
  extractContentId(url: string): string | null;

  /** Fetch content data from the platform API. */
  fetchContent(contentId: string, userId: string): Promise<ContentData | null>;

  /** Run all verification checks against a proof URL. */
  verify(request: VerificationRequest, userId: string): Promise<VerificationCheck>;
}

// ─── Base Adapter ───────────────────────────────────────────────────────────

abstract class BaseAdapter implements PlatformAdapter {
  abstract readonly platformId: string;
  abstract readonly platformName: string;

  protected oauth: OAuthManager;
  protected rateLimiter: PlatformRateLimiter;

  constructor(oauth: OAuthManager, rateLimiter: PlatformRateLimiter) {
    this.oauth = oauth;
    this.rateLimiter = rateLimiter;
  }

  abstract isAvailable(): boolean;
  abstract extractContentId(url: string): string | null;
  abstract fetchContent(contentId: string, userId: string): Promise<ContentData | null>;

  /**
   * Make an authenticated API request to the platform.
   */
  protected async apiRequest(
    url: string,
    userId: string,
    options?: RequestInit
  ): Promise<Response> {
    const token = await this.oauth.getValidToken(this.platformId, userId);
    if (!token) {
      throw new Error(`No valid token for ${this.platformName} (user: ${userId})`);
    }

    const release = await this.rateLimiter.acquire(this.platformId);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `${token.tokenType} ${token.accessToken}`,
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
        this.rateLimiter.reportThrottled(this.platformId, retryMs);
        throw new Error(`429 Rate limited by ${this.platformName}`);
      }

      this.rateLimiter.reportSuccess(this.platformId);
      return response;
    } finally {
      release();
    }
  }

  /**
   * Default verify implementation using fetchContent + checks.
   */
  async verify(request: VerificationRequest, userId: string): Promise<VerificationCheck> {
    const contentId = this.extractContentId(request.proofUrl);
    const details: Record<string, unknown> = { contentId };

    if (!contentId) {
      return {
        exists: false,
        authorMatch: false,
        withinTimeWindow: false,
        hasRequiredHashtags: false,
        hasRequiredMentions: false,
        meetsEngagement: false,
        confidence: 0.1,
        details: { ...details, error: "Could not extract content ID from URL" },
      };
    }

    let content: ContentData | null;
    try {
      content = await this.fetchContent(contentId, userId);
    } catch (err) {
      return {
        exists: false,
        authorMatch: false,
        withinTimeWindow: false,
        hasRequiredHashtags: false,
        hasRequiredMentions: false,
        meetsEngagement: false,
        confidence: 0.05,
        details: { ...details, error: err instanceof Error ? err.message : "Fetch failed" },
      };
    }

    if (!content) {
      return {
        exists: false,
        authorMatch: false,
        withinTimeWindow: false,
        hasRequiredHashtags: false,
        hasRequiredMentions: false,
        meetsEngagement: false,
        confidence: 0.05,
        details: { ...details, error: "Content not found" },
      };
    }

    // Run checks
    const exists = true;

    const authorMatch = request.expectedAuthorId
      ? content.authorId === request.expectedAuthorId
      : true; // No expected author = skip check

    const withinTimeWindow = this.checkTimeWindow(
      content.createdAt,
      request.postedAfter,
      request.postedBefore
    );

    const hasRequiredHashtags = this.checkHashtags(
      content.hashtags,
      request.requiredHashtags
    );

    const hasRequiredMentions = this.checkMentions(
      content.mentions,
      request.requiredMentions
    );

    const meetsEngagement = this.checkEngagement(
      content.metrics,
      request.minMetrics
    );

    // Calculate confidence score
    let confidence = 0;
    const weights = { exists: 0.3, author: 0.25, time: 0.15, hashtags: 0.15, mentions: 0.1, engagement: 0.05 };
    if (exists) confidence += weights.exists;
    if (authorMatch) confidence += weights.author;
    if (withinTimeWindow) confidence += weights.time;
    if (hasRequiredHashtags) confidence += weights.hashtags;
    if (hasRequiredMentions) confidence += weights.mentions;
    if (meetsEngagement) confidence += weights.engagement;

    return {
      exists,
      authorMatch,
      withinTimeWindow,
      hasRequiredHashtags,
      hasRequiredMentions,
      meetsEngagement,
      confidence: Math.round(confidence * 100) / 100,
      details: {
        ...details,
        contentType: content.contentType,
        authorId: content.authorId,
        authorName: content.authorName,
        createdAt: content.createdAt,
        metrics: content.metrics,
        foundHashtags: content.hashtags,
        foundMentions: content.mentions,
      },
    };
  }

  protected checkTimeWindow(createdAt: string, after?: string, before?: string): boolean {
    if (!after && !before) return true;
    const created = new Date(createdAt).getTime();
    if (after && created < new Date(after).getTime()) return false;
    if (before && created > new Date(before).getTime()) return false;
    return true;
  }

  protected checkHashtags(found: string[], required?: string[]): boolean {
    if (!required || required.length === 0) return true;
    const lower = found.map((h) => h.toLowerCase().replace(/^#/, ""));
    return required.every((r) => lower.includes(r.toLowerCase().replace(/^#/, "")));
  }

  protected checkMentions(found: string[], required?: string[]): boolean {
    if (!required || required.length === 0) return true;
    const lower = found.map((m) => m.toLowerCase().replace(/^@/, ""));
    return required.every((r) => lower.includes(r.toLowerCase().replace(/^@/, "")));
  }

  protected checkEngagement(metrics: ContentMetrics, min?: Partial<ContentMetrics>): boolean {
    if (!min) return true;
    if (min.likes !== undefined && metrics.likes < min.likes) return false;
    if (min.comments !== undefined && metrics.comments < min.comments) return false;
    if (min.shares !== undefined && metrics.shares < min.shares) return false;
    if (min.views !== undefined && metrics.views < min.views) return false;
    return true;
  }
}

// ─── Instagram Adapter ──────────────────────────────────────────────────────

export class InstagramAdapter extends BaseAdapter {
  readonly platformId = "ig";
  readonly platformName = "Instagram";

  isAvailable(): boolean {
    return this.oauth.isConfigured("ig");
  }

  extractContentId(url: string): string | null {
    // Instagram URLs: instagram.com/p/{shortcode}/, instagram.com/reel/{shortcode}/
    const patterns = [
      /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
      /instagr\.am\/p\/([A-Za-z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    // Instagram Graph API: GET /{media-id}?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count
    const fields = "id,caption,media_type,timestamp,permalink,like_count,comments_count,media_url,thumbnail_url";
    const response = await this.apiRequest(
      `https://graph.instagram.com/${contentId}?fields=${fields}`,
      userId
    );

    if (!response.ok) return null;
    const data = await response.json();

    const caption = data.caption ?? "";
    const hashtags = (caption.match(/#[\w]+/g) ?? []).map((h: string) => h.slice(1));
    const mentions = (caption.match(/@[\w.]+/g) ?? []).map((m: string) => m.slice(1));

    return {
      contentId: data.id,
      permalink: data.permalink ?? `https://instagram.com/p/${contentId}/`,
      contentType: data.media_type?.toLowerCase() ?? "unknown",
      textContent: caption,
      createdAt: data.timestamp ?? new Date().toISOString(),
      authorId: data.user?.id ?? "",
      authorName: data.user?.username ?? "",
      metrics: {
        likes: data.like_count ?? 0,
        comments: data.comments_count ?? 0,
        shares: 0, // Not available via public API
        views: 0,
        saves: 0,
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      },
      mediaUrls: [data.media_url ?? data.thumbnail_url].filter(Boolean),
      hashtags,
      mentions,
      rawResponse: data,
    };
  }
}

// ─── TikTok Adapter ─────────────────────────────────────────────────────────

export class TikTokAdapter extends BaseAdapter {
  readonly platformId = "tt";
  readonly platformName = "TikTok";

  isAvailable(): boolean {
    return this.oauth.isConfigured("tt");
  }

  extractContentId(url: string): string | null {
    // TikTok URLs: tiktok.com/@user/video/{id}, vm.tiktok.com/{shortcode}
    const patterns = [
      /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
      /tiktok\.com\/@[\w.]+\/photo\/(\d+)/,
      /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    // TikTok API v2: POST /video/query/ with video IDs
    const response = await this.apiRequest(
      "https://open.tiktokapis.com/v2/video/query/",
      userId,
      {
        method: "POST",
        body: JSON.stringify({
          filters: { video_ids: [contentId] },
          fields: ["id", "title", "video_description", "create_time", "share_url", "like_count", "comment_count", "share_count", "view_count"],
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const video = data.data?.videos?.[0];
    if (!video) return null;

    const description = video.video_description ?? video.title ?? "";
    const hashtags = (description.match(/#[\w]+/g) ?? []).map((h: string) => h.slice(1));
    const mentions = (description.match(/@[\w.]+/g) ?? []).map((m: string) => m.slice(1));

    return {
      contentId: video.id,
      permalink: video.share_url ?? `https://tiktok.com/video/${contentId}`,
      contentType: "video",
      textContent: description,
      createdAt: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
      authorId: video.author?.id ?? "",
      authorName: video.author?.display_name ?? "",
      metrics: {
        likes: video.like_count ?? 0,
        comments: video.comment_count ?? 0,
        shares: video.share_count ?? 0,
        views: video.view_count ?? 0,
        saves: 0,
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      },
      mediaUrls: [],
      hashtags,
      mentions,
      rawResponse: data,
    };
  }
}

// ─── YouTube Adapter ────────────────────────────────────────────────────────

export class YouTubeAdapter extends BaseAdapter {
  readonly platformId = "yt";
  readonly platformName = "YouTube";

  isAvailable(): boolean {
    return this.oauth.isConfigured("yt");
  }

  extractContentId(url: string): string | null {
    const patterns = [
      /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const parts = "snippet,statistics";
    const response = await this.apiRequest(
      `https://www.googleapis.com/youtube/v3/videos?id=${contentId}&part=${parts}`,
      userId
    );

    if (!response.ok) return null;
    const data = await response.json();
    const video = data.items?.[0];
    if (!video) return null;

    const description = video.snippet?.description ?? "";
    const title = video.snippet?.title ?? "";
    const fullText = `${title} ${description}`;
    const hashtags = (fullText.match(/#[\w]+/g) ?? []).map((h: string) => h.slice(1));

    return {
      contentId: video.id,
      permalink: `https://youtube.com/watch?v=${contentId}`,
      contentType: video.snippet?.categoryId === "22" ? "short" : "video",
      textContent: fullText,
      createdAt: video.snippet?.publishedAt ?? new Date().toISOString(),
      authorId: video.snippet?.channelId ?? "",
      authorName: video.snippet?.channelTitle ?? "",
      metrics: {
        likes: parseInt(video.statistics?.likeCount ?? "0"),
        comments: parseInt(video.statistics?.commentCount ?? "0"),
        shares: 0,
        views: parseInt(video.statistics?.viewCount ?? "0"),
        saves: parseInt(video.statistics?.favoriteCount ?? "0"),
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      },
      mediaUrls: [video.snippet?.thumbnails?.high?.url].filter(Boolean),
      hashtags,
      mentions: [],
      rawResponse: data,
    };
  }
}

// ─── X (Twitter) Adapter ────────────────────────────────────────────────────

export class XAdapter extends BaseAdapter {
  readonly platformId = "xw";
  readonly platformName = "X";

  isAvailable(): boolean {
    return this.oauth.isConfigured("xw");
  }

  extractContentId(url: string): string | null {
    const patterns = [
      /(?:twitter|x)\.com\/\w+\/status\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const fields = "tweet.fields=id,text,created_at,public_metrics,entities,author_id";
    const expansions = "expansions=author_id";
    const response = await this.apiRequest(
      `https://api.twitter.com/2/tweets/${contentId}?${fields}&${expansions}`,
      userId
    );

    if (!response.ok) return null;
    const data = await response.json();
    const tweet = data.data;
    if (!tweet) return null;

    const author = data.includes?.users?.[0];
    const hashtags = tweet.entities?.hashtags?.map((h: { tag: string }) => h.tag) ?? [];
    const mentions = tweet.entities?.mentions?.map((m: { username: string }) => m.username) ?? [];

    return {
      contentId: tweet.id,
      permalink: `https://x.com/i/status/${contentId}`,
      contentType: "tweet",
      textContent: tweet.text ?? "",
      createdAt: tweet.created_at ?? new Date().toISOString(),
      authorId: tweet.author_id ?? "",
      authorName: author?.username ?? "",
      metrics: {
        likes: tweet.public_metrics?.like_count ?? 0,
        comments: tweet.public_metrics?.reply_count ?? 0,
        shares: tweet.public_metrics?.retweet_count ?? 0,
        views: tweet.public_metrics?.impression_count ?? 0,
        saves: tweet.public_metrics?.bookmark_count ?? 0,
        impressions: tweet.public_metrics?.impression_count ?? 0,
        reach: 0,
        engagementRate: 0,
      },
      mediaUrls: [],
      hashtags,
      mentions,
      rawResponse: data,
    };
  }
}

// ─── Google Review Adapter ──────────────────────────────────────────────────

export class GoogleReviewAdapter extends BaseAdapter {
  readonly platformId = "go";
  readonly platformName = "Google";

  isAvailable(): boolean {
    return this.oauth.isConfigured("go");
  }

  extractContentId(url: string): string | null {
    // Google review URLs are complex; extract place ID or review ID
    const patterns = [
      /google\.com\/maps\/place\/[^/]+\/@[^/]+\/data=.*!4m\d+!3m\d+!1s([^!]+)/,
      /search\.google\.com\/local\/reviews\?placeid=([^&]+)/,
      /maps\/contrib\/(\d+)\/reviews/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    // Fallback: use the full URL as identifier
    if (url.includes("google.com/maps")) return url;
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    // Google My Business API: accounts/{accountId}/locations/{locationId}/reviews
    // This requires the business's GMB credentials, not the reviewer's
    const response = await this.apiRequest(
      `https://mybusiness.googleapis.com/v4/accounts/me/locations/-/reviews?pageSize=50`,
      userId
    );

    if (!response.ok) return null;
    const data = await response.json();

    // Search for matching review
    const review = data.reviews?.find((r: Record<string, unknown>) =>
      r.name === contentId || r.reviewId === contentId
    );

    if (!review) return null;

    return {
      contentId: review.reviewId ?? review.name ?? contentId,
      permalink: "", // Google reviews don't have stable permalinks
      contentType: "review",
      textContent: review.comment ?? "",
      createdAt: review.createTime ?? new Date().toISOString(),
      authorId: review.reviewer?.profilePhotoUrl ?? "",
      authorName: review.reviewer?.displayName ?? "",
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        saves: 0,
        impressions: 0,
        reach: 0,
        engagementRate: 0,
      },
      mediaUrls: [],
      hashtags: [],
      mentions: [],
      rawResponse: review,
    };
  }
}

// ─── Telegram Adapter ────────────────────────────────────────────────────────

export class TelegramAdapter extends BaseAdapter {
  readonly platformId = "tg";
  readonly platformName = "Telegram";

  isAvailable(): boolean {
    return this.oauth.isConfigured("tg");
  }

  extractContentId(url: string): string | null {
    // Telegram URLs: t.me/{channel}/{postId}
    const patterns = [
      /t\.me\/([^/]+)\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `${match[1]}/${match[2]}`;
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const [channel, messageId] = contentId.split("/");
    const response = await this.apiRequest(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/forwardMessage?chat_id=@${channel}&message_id=${messageId}`,
      userId
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      contentId,
      permalink: `https://t.me/${channel}/${messageId}`,
      contentType: "message",
      textContent: data.result?.text ?? "",
      createdAt: data.result?.date ? new Date(data.result.date * 1000).toISOString() : new Date().toISOString(),
      authorId: data.result?.from?.id?.toString() ?? "",
      authorName: data.result?.from?.username ?? "",
      metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, impressions: 0, reach: 0, engagementRate: 0 },
      mediaUrls: [],
      hashtags: [],
      mentions: [],
      rawResponse: data,
    };
  }
}

// ─── Discord Adapter ─────────────────────────────────────────────────────────

export class DiscordAdapter extends BaseAdapter {
  readonly platformId = "dc";
  readonly platformName = "Discord";

  isAvailable(): boolean {
    return this.oauth.isConfigured("dc");
  }

  extractContentId(url: string): string | null {
    // Discord URLs: discord.com/channels/{guildId}/{channelId}/{messageId}
    const patterns = [
      /discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `${match[1]}/${match[2]}/${match[3]}`;
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const [guildId, channelId, messageId] = contentId.split("/");
    const response = await this.apiRequest(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      userId
    );
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.content ?? "";
    const hashtags = (text.match(/#[\w]+/g) ?? []).map((h: string) => h.slice(1));
    const mentions = (text.match(/@[\w.]+/g) ?? []).map((m: string) => m.slice(1));
    return {
      contentId: messageId,
      permalink: `https://discord.com/channels/${guildId}/${channelId}/${messageId}`,
      contentType: "message",
      textContent: text,
      createdAt: data.timestamp ?? new Date().toISOString(),
      authorId: data.author?.id ?? "",
      authorName: data.author?.username ?? "",
      metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, impressions: 0, reach: 0, engagementRate: 0 },
      mediaUrls: (data.attachments ?? []).map((a: { url: string }) => a.url),
      hashtags,
      mentions,
      rawResponse: data,
    };
  }
}

// ─── Twitch Adapter ──────────────────────────────────────────────────────────

export class TwitchAdapter extends BaseAdapter {
  readonly platformId = "tw";
  readonly platformName = "Twitch";

  isAvailable(): boolean {
    return this.oauth.isConfigured("tw");
  }

  extractContentId(url: string): string | null {
    // Twitch URLs: twitch.tv/{channel}/clip/{clipId}, clips.twitch.tv/{clipId}
    const patterns = [
      /twitch\.tv\/\w+\/clip\/([A-Za-z0-9_-]+)/,
      /clips\.twitch\.tv\/([A-Za-z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const response = await this.apiRequest(
      `https://api.twitch.tv/helix/clips?id=${contentId}`,
      userId,
      { headers: { "Client-Id": process.env.TWITCH_CLIENT_ID ?? "" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const clip = data.data?.[0];
    if (!clip) return null;
    return {
      contentId: clip.id,
      permalink: clip.url ?? `https://clips.twitch.tv/${contentId}`,
      contentType: "clip",
      textContent: clip.title ?? "",
      createdAt: clip.created_at ?? new Date().toISOString(),
      authorId: clip.broadcaster_id ?? "",
      authorName: clip.broadcaster_name ?? "",
      metrics: {
        likes: 0, comments: 0, shares: 0,
        views: clip.view_count ?? 0,
        saves: 0, impressions: 0, reach: 0, engagementRate: 0,
      },
      mediaUrls: [clip.thumbnail_url].filter(Boolean),
      hashtags: [],
      mentions: [],
      rawResponse: data,
    };
  }
}

// ─── Tumblr Adapter ──────────────────────────────────────────────────────────

export class TumblrAdapter extends BaseAdapter {
  readonly platformId = "tm";
  readonly platformName = "Tumblr";

  isAvailable(): boolean {
    return this.oauth.isConfigured("tm");
  }

  extractContentId(url: string): string | null {
    // Tumblr URLs: {blog}.tumblr.com/post/{postId}
    const patterns = [
      /([a-z0-9-]+)\.tumblr\.com\/post\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `${match[1]}/${match[2]}`;
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const [blog, postId] = contentId.split("/");
    const response = await this.apiRequest(
      `https://api.tumblr.com/v2/blog/${blog}.tumblr.com/posts/${postId}`,
      userId
    );
    if (!response.ok) return null;
    const data = await response.json();
    const post = data.response?.posts?.[0] ?? data.response;
    if (!post) return null;
    const text = post.summary ?? post.body ?? post.caption ?? "";
    const hashtags = (post.tags ?? []) as string[];
    return {
      contentId: postId,
      permalink: post.post_url ?? `https://${blog}.tumblr.com/post/${postId}`,
      contentType: post.type ?? "text",
      textContent: text,
      createdAt: post.date ?? new Date().toISOString(),
      authorId: post.blog?.uuid ?? "",
      authorName: post.blog?.name ?? blog,
      metrics: {
        likes: post.note_count ?? 0, comments: 0, shares: 0,
        views: 0, saves: 0, impressions: 0, reach: 0, engagementRate: 0,
      },
      mediaUrls: (post.photos ?? []).map((p: { original_size: { url: string } }) => p.original_size?.url).filter(Boolean),
      hashtags,
      mentions: [],
      rawResponse: data,
    };
  }
}

// ─── Lemon8 Adapter ─────────────────────────────────────────────────────────

export class Lemon8Adapter extends BaseAdapter {
  readonly platformId = "l8";
  readonly platformName = "Lemon8";

  isAvailable(): boolean {
    return false; // No public API available
  }

  extractContentId(url: string): string | null {
    // Lemon8 URLs: lemon8-app.com/{user}/post/{postId}
    const patterns = [
      /lemon8-app\.com\/[^/]+\/post\/(\d+)/,
      /lemon8-app\.com\/[^/]+\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchContent(): Promise<ContentData | null> {
    // No public API — verification uses screenshot/URL matching
    return null;
  }
}

// ─── Bluesky Adapter ────────────────────────────────────────────────────────

export class BlueskyAdapter extends BaseAdapter {
  readonly platformId = "bs";
  readonly platformName = "Bluesky";

  isAvailable(): boolean {
    return this.oauth.isConfigured("bs");
  }

  extractContentId(url: string): string | null {
    // Bluesky URLs: bsky.app/profile/{handle}/post/{postId}
    const patterns = [
      /bsky\.app\/profile\/([^/]+)\/post\/([a-z0-9]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `${match[1]}/${match[2]}`;
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const [handle, postId] = contentId.split("/");
    const uri = `at://${handle}/app.bsky.feed.post/${postId}`;
    const response = await this.apiRequest(
      `https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=0`,
      userId
    );
    if (!response.ok) return null;
    const data = await response.json();
    const post = data.thread?.post;
    if (!post) return null;
    const text = post.record?.text ?? "";
    const hashtags = (text.match(/#[\w]+/g) ?? []).map((h: string) => h.slice(1));
    const mentions = (text.match(/@[\w.]+/g) ?? []).map((m: string) => m.slice(1));
    return {
      contentId: postId,
      permalink: `https://bsky.app/profile/${handle}/post/${postId}`,
      contentType: "post",
      textContent: text,
      createdAt: post.record?.createdAt ?? new Date().toISOString(),
      authorId: post.author?.did ?? "",
      authorName: post.author?.handle ?? handle,
      metrics: {
        likes: post.likeCount ?? 0,
        comments: post.replyCount ?? 0,
        shares: post.repostCount ?? 0,
        views: 0, saves: 0, impressions: 0, reach: 0, engagementRate: 0,
      },
      mediaUrls: [],
      hashtags,
      mentions,
      rawResponse: data,
    };
  }
}

// ─── Mastodon Adapter ───────────────────────────────────────────────────────

export class MastodonAdapter extends BaseAdapter {
  readonly platformId = "md";
  readonly platformName = "Mastodon";

  isAvailable(): boolean {
    return this.oauth.isConfigured("md");
  }

  extractContentId(url: string): string | null {
    // Mastodon URLs: {instance}/@{user}/{postId}
    const patterns = [
      /https?:\/\/([^/]+)\/@[^/]+\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `${match[1]}/${match[2]}`;
    }
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    const [instance, statusId] = contentId.split("/");
    const response = await this.apiRequest(
      `https://${instance}/api/v1/statuses/${statusId}`,
      userId
    );
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.content?.replace(/<[^>]+>/g, "") ?? "";
    const hashtags = (data.tags ?? []).map((t: { name: string }) => t.name);
    const mentions = (data.mentions ?? []).map((m: { acct: string }) => m.acct);
    return {
      contentId: statusId,
      permalink: data.url ?? `https://${instance}/@${data.account?.acct}/${statusId}`,
      contentType: "toot",
      textContent: text,
      createdAt: data.created_at ?? new Date().toISOString(),
      authorId: data.account?.id ?? "",
      authorName: data.account?.acct ?? "",
      metrics: {
        likes: data.favourites_count ?? 0,
        comments: data.replies_count ?? 0,
        shares: data.reblogs_count ?? 0,
        views: 0, saves: data.bookmarked ? 1 : 0,
        impressions: 0, reach: 0, engagementRate: 0,
      },
      mediaUrls: (data.media_attachments ?? []).map((a: { url: string }) => a.url),
      hashtags,
      mentions,
      rawResponse: data,
    };
  }
}

// ─── Google Maps Adapter ────────────────────────────────────────────────────

export class GoogleMapsAdapter extends BaseAdapter {
  readonly platformId = "gm";
  readonly platformName = "Google Maps";

  isAvailable(): boolean {
    return this.oauth.isConfigured("gm");
  }

  extractContentId(url: string): string | null {
    // Google Maps URLs: google.com/maps/place/{place}, maps.app.goo.gl/{shortId}
    const patterns = [
      /google\.com\/maps\/place\/[^/]+\/@[^/]+\/data=.*!1s([^!]+)/,
      /google\.com\/maps\/place\/([^/?]+)/,
      /maps\.app\.goo\.gl\/([A-Za-z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    if (url.includes("google.com/maps")) return url;
    return null;
  }

  async fetchContent(contentId: string, userId: string): Promise<ContentData | null> {
    // Uses the same Google My Business API as the Google Review adapter
    const response = await this.apiRequest(
      `https://mybusiness.googleapis.com/v4/accounts/me/locations/-/reviews?pageSize=50`,
      userId
    );
    if (!response.ok) return null;
    const data = await response.json();
    const review = data.reviews?.find((r: Record<string, unknown>) =>
      r.name === contentId || r.reviewId === contentId
    );
    if (!review) return null;
    return {
      contentId: review.reviewId ?? review.name ?? contentId,
      permalink: "",
      contentType: "review",
      textContent: review.comment ?? "",
      createdAt: review.createTime ?? new Date().toISOString(),
      authorId: review.reviewer?.profilePhotoUrl ?? "",
      authorName: review.reviewer?.displayName ?? "",
      metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, impressions: 0, reach: 0, engagementRate: 0 },
      mediaUrls: [],
      hashtags: [],
      mentions: [],
      rawResponse: review,
    };
  }
}

// ─── Adapter Registry ───────────────────────────────────────────────────────

export class PlatformAdapterRegistry {
  private adapters = new Map<string, PlatformAdapter>();

  constructor(oauth: OAuthManager, rateLimiter: PlatformRateLimiter) {
    this.register(new InstagramAdapter(oauth, rateLimiter));
    this.register(new TikTokAdapter(oauth, rateLimiter));
    this.register(new YouTubeAdapter(oauth, rateLimiter));
    this.register(new XAdapter(oauth, rateLimiter));
    this.register(new GoogleReviewAdapter(oauth, rateLimiter));
    this.register(new TelegramAdapter(oauth, rateLimiter));
    this.register(new DiscordAdapter(oauth, rateLimiter));
    this.register(new TwitchAdapter(oauth, rateLimiter));
    this.register(new TumblrAdapter(oauth, rateLimiter));
    this.register(new Lemon8Adapter(oauth, rateLimiter));
    this.register(new BlueskyAdapter(oauth, rateLimiter));
    this.register(new MastodonAdapter(oauth, rateLimiter));
    this.register(new GoogleMapsAdapter(oauth, rateLimiter));
  }

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platformId, adapter);
  }

  get(platformId: string): PlatformAdapter | null {
    return this.adapters.get(platformId) ?? null;
  }

  getAvailable(): PlatformAdapter[] {
    return Array.from(this.adapters.values()).filter((a) => a.isAvailable());
  }

  getAllIds(): string[] {
    return Array.from(this.adapters.keys());
  }
}
