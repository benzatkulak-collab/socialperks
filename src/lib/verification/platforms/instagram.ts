/**
 * Instagram verification — real Graph API client.
 *
 * Activated when OAUTH_IG_CLIENT_ID + OAUTH_IG_CLIENT_SECRET are
 * set (the router checks this). When activated, the verification
 * engine treats results as authoritative — `isMock: false`
 * unblocks the production-redemption path.
 *
 * API: https://developers.facebook.com/docs/instagram-api
 *
 * Field set we request:
 *   id, caption, media_type, owner, timestamp, permalink
 * That's enough for our checks; we don't pull engagement metrics
 * (likes/comments) here because they're not part of the verify
 * pass — fraud-detection adds them later via a separate fetch.
 *
 * Failure modes:
 *   - 4xx → log + return null. Can't see the post (private,
 *     deleted, or the customer's token doesn't have permission).
 *   - 5xx / network → return null and let the engine retry on
 *     the redemption-time recheck. We don't bake retries here
 *     because adding latency to verification's hot path is worse
 *     than letting the engine decide.
 */

import type { PlatformVerifier, PlatformPost, VerificationEvidence } from "./types";
import { evaluatePost, extractHashtags, extractMentions } from "./matchers";
import { readCache, writeCache } from "./cache";

const IG_URL_RE = /^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
const GRAPH_BASE = "https://graph.instagram.com";
const FETCH_TIMEOUT_MS = 8_000;

interface GraphMediaResponse {
  id: string;
  caption?: string;
  media_type?: string;
  owner?: { id: string };
  timestamp?: string;
  permalink?: string;
  username?: string;
}

interface GraphErrorResponse {
  error?: { code?: number; message?: string; type?: string };
}

async function fetchGraph(
  mediaId: string,
  accessToken: string,
): Promise<GraphMediaResponse | null> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(mediaId)}`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,owner,timestamp,permalink,username",
  );
  url.searchParams.set("access_token", accessToken);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body: GraphErrorResponse = await res.json().catch(() => ({}));
      console.warn(
        `[ig-graph] media fetch failed ${res.status}: ${body.error?.message ?? "(no message)"}`,
      );
      return null;
    }
    return (await res.json()) as GraphMediaResponse;
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    console.warn(`[ig-graph] media fetch ${isAbort ? "timed out" : "errored"}:`, e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const instagramReal: PlatformVerifier = {
  platform: "instagram",
  requiresOAuth: true,
  isMock: false,

  parseMediaId(url) {
    const m = IG_URL_RE.exec(url);
    return m?.[1] ?? null;
  },

  async fetchPost(args) {
    if (!args.bypassCache) {
      const cached = await readCache("instagram", args.mediaId);
      if (cached) return cached;
    }
    if (!args.accessToken) {
      console.warn("[ig-graph] no access token; cannot fetch — customer must connect their IG account");
      return null;
    }
    const raw = await fetchGraph(args.mediaId, args.accessToken);
    if (!raw) return null;

    const caption = raw.caption ?? "";
    const post: PlatformPost = {
      id: raw.id,
      platform: "instagram",
      ownerId: raw.owner?.id ?? "",
      ownerHandle: raw.username,
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      permalink: raw.permalink,
      createdAt: raw.timestamp ?? new Date().toISOString(),
      meta: { mediaType: raw.media_type, source: "graph" },
    };
    await writeCache(post, { source: "fetch" });
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
    return evaluatePost({
      post,
      business: args.business,
      customerOwnerId: args.customerOwnerId,
    });
  },
};
