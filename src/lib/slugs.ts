/**
 * URL slug helpers shared across public profile and city pages.
 */

export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildBusinessSlug(b: { id: string; name: string }): string {
  return `${toSlug(b.name)}-${b.id.slice(-6)}`;
}

export function buildInfluencerSlug(i: { id: string; displayName: string }): string {
  return `${toSlug(i.displayName)}-${i.id.slice(-6)}`;
}

/** Reverse lookup: pull the trailing id chunk back out. */
export function idFromSlug(slug: string): string | null {
  const match = slug.match(/-([a-z0-9]{6})$/i);
  return match ? match[1] : null;
}
