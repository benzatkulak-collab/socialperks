/**
 * Instagram verification — mock adapter. Used when
 * OAUTH_IG_CLIENT_ID + OAUTH_IG_CLIENT_SECRET are unset, which is
 * the dev / no-credentials state.
 *
 * Behavior:
 *   - parseMediaId mirrors the real adapter (so tests against the
 *     mock match the real-adapter shape).
 *   - fetchPost returns a deterministic synthetic post derived
 *     from the URL — same input = same output, useful for repeat
 *     tests.
 *   - The synthetic post always passes mentions + disclosure
 *     checks, so demo-mode redemptions work cleanly.
 *
 * The verification engine MUST refuse to issue real-money
 * redemptions when isMock=true unless an admin manually
 * approved (see VERIFICATION_ENGINE_REAL_API.md). Adapter
 * surfaces isMock as a static prop; engine reads it.
 */

import type { PlatformVerifier, PlatformPost, BusinessIdentity, VerificationEvidence } from "./types";
import { evaluatePost, extractHashtags, extractMentions } from "./matchers";
import { readCache, writeCache } from "./cache";

// Instagram URLs we recognize. Real adapter uses the same regex.
const IG_URL_RE = /^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;

function deterministicHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export const instagramMock: PlatformVerifier = {
  platform: "instagram",
  requiresOAuth: true,
  isMock: true,

  parseMediaId(url) {
    const m = IG_URL_RE.exec(url);
    return m?.[1] ?? null;
  },

  async fetchPost(args) {
    if (!args.bypassCache) {
      const cached = await readCache("instagram", args.mediaId);
      if (cached) return cached;
    }
    // Synthesize a post deterministically from the media id so the
    // same URL always returns the same demo data.
    const seed = deterministicHash(args.mediaId);
    const caption =
      `Excellent visit to {{business}}! Highly recommend the espresso. ` +
      `#ad #localcoffee #${seed.slice(0, 6)}`;
    const post: PlatformPost = {
      id: args.mediaId,
      platform: "instagram",
      ownerId: `mock_user_${seed.slice(0, 8)}`,
      ownerHandle: `mock_user_${seed.slice(0, 8)}`,
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      permalink: `https://www.instagram.com/p/${args.mediaId}/`,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      meta: { source: "mock" },
    };
    await writeCache(post, { source: "mock", ttlMs: 60_000 });
    return post;
  },

  async verify(args): Promise<VerificationEvidence> {
    const mediaId = this.parseMediaId(args.proofUrl);
    if (!mediaId) {
      return {
        exists: false,
        ownerMatches: false,
        mentionsBusiness: false,
        hasFtcDisclosure: false,
        notes: ["URL doesn't look like an Instagram post"],
      };
    }
    const post = await this.fetchPost({
      mediaId,
      accessToken: args.accessToken,
      bypassCache: args.bypassCache,
    });
    // Mock posts always have the demo business name interpolated so
    // mentions check passes deterministically.
    const stitchedCaption = post
      ? { ...post, caption: post.caption.replace("{{business}}", args.business.name) }
      : null;
    const stitchedWithMentions = stitchedCaption
      ? {
          ...stitchedCaption,
          mentions: [...stitchedCaption.mentions, ...args.business.handles.map((h) => h.replace(/^@/, "").toLowerCase())],
        }
      : null;
    const business: BusinessIdentity = args.business;
    return evaluatePost({
      post: stitchedWithMentions,
      business,
      customerOwnerId: args.customerOwnerId ?? stitchedWithMentions?.ownerId,
    });
  },
};
