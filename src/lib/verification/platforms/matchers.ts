/**
 * Shared matchers used by every platform adapter.
 *
 * Lives in its own file because each adapter (instagram.ts,
 * tiktok.ts, etc.) needs the same logic — extracting hashtags,
 * detecting #ad, checking business mentions — and copy-pasting
 * across adapters is how regressions accumulate.
 */

import type { BusinessIdentity, PlatformPost, VerificationEvidence } from "./types";

const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;
const MENTION_RE = /@([\p{L}\p{N}_.-]+)/gu;

export function extractHashtags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(HASHTAG_RE)) {
    if (m[1]) out.push(m[1].toLowerCase());
  }
  return out;
}

export function extractMentions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION_RE)) {
    if (m[1]) out.push(m[1].toLowerCase());
  }
  return out;
}

/**
 * FTC-required disclosure detection. Conservative: we accept the
 * common forms used in practice. False negatives are fine (the
 * customer just gets asked to add #ad); false positives are
 * NOT fine (we'd issue perks for non-disclosed posts and create
 * legal exposure).
 */
const DISCLOSURE_TOKENS = [
  "#ad",
  "#sponsored",
  "#partner",
  "#partnership",
  "#paidpartnership",
  "#paidpromotion",
  "in partnership with",
  "thanks to {business}",
  "in exchange for",
  "i received a discount",
  "sponsored by",
];

export function hasFtcDisclosure(post: PlatformPost): boolean {
  const haystack = post.caption.toLowerCase();
  // Hashtags that came in via the dedicated array also count even
  // if some platforms don't include them in the caption text.
  const tagSet = new Set(post.hashtags.map((h) => "#" + h.toLowerCase()));
  for (const token of DISCLOSURE_TOKENS) {
    const lc = token.toLowerCase();
    if (haystack.includes(lc)) return true;
    if (lc.startsWith("#") && tagSet.has(lc)) return true;
  }
  return false;
}

export function mentionsBusiness(post: PlatformPost, business: BusinessIdentity): boolean {
  const handles = new Set(business.handles.map((h) => h.replace(/^@/, "").toLowerCase()));
  const tags = new Set(business.hashtags.map((h) => h.replace(/^#/, "").toLowerCase()));
  const nameLc = business.name.toLowerCase();

  // 1. @-mention of any configured handle
  for (const m of post.mentions) {
    if (handles.has(m.toLowerCase())) return true;
  }
  // 2. Hashtag match against any configured tag
  for (const t of post.hashtags) {
    if (tags.has(t.toLowerCase())) return true;
  }
  // 3. Substring match on the business name in the caption
  if (post.caption.toLowerCase().includes(nameLc)) return true;
  return false;
}

/**
 * Compose all checks into a single VerificationEvidence object.
 * Adapter-specific code calls this after fetchPost — keeps the
 * adapters thin.
 */
export function evaluatePost(args: {
  post: PlatformPost | null;
  business: BusinessIdentity;
  customerOwnerId?: string;
}): VerificationEvidence {
  if (!args.post) {
    return {
      exists: false,
      ownerMatches: false,
      mentionsBusiness: false,
      hasFtcDisclosure: false,
      notes: ["post not found — may be deleted, private, or never existed"],
    };
  }
  const ownerMatches =
    args.customerOwnerId === undefined
      ? false
      : args.post.ownerId === args.customerOwnerId;
  return {
    exists: true,
    ownerMatches,
    mentionsBusiness: mentionsBusiness(args.post, args.business),
    hasFtcDisclosure: hasFtcDisclosure(args.post),
    post: args.post,
    notes: ownerMatches ? undefined : ["owner_id on post did not match customer's connected account"],
  };
}
