/**
 * City catalog driving the programmatic `/in/[city]` SEO pages.
 *
 * Cities are derived from the seed business locations + an explicit
 * launch-priority list. The launch-priority cities ALWAYS render even
 * when no businesses live there yet, because they're our outbound
 * targets and we want the indexable page to exist before the first
 * customer lands. Other cities only render when at least one business
 * is in them.
 */

import { createSeedData } from "@/lib/seed";
import { toSlug } from "@/lib/slugs";

export interface City {
  slug: string;
  name: string;
  state: string | null;
  /** Launch-priority cities are always rendered, even with 0 businesses. */
  priority: boolean;
}

const LAUNCH_PRIORITY: City[] = [
  { slug: "washington-dc", name: "Washington", state: "DC", priority: true },
  { slug: "arlington-va", name: "Arlington", state: "VA", priority: true },
  { slug: "bethesda-md", name: "Bethesda", state: "MD", priority: true },
  { slug: "alexandria-va", name: "Alexandria", state: "VA", priority: true },
];

function parseLocation(loc: string | undefined | null): { name: string; state: string | null } | null {
  if (!loc) return null;
  // Common formats: "Washington, DC", "Bethesda, MD", "New York"
  const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return { name: parts[0], state: parts[1] ?? null };
}

/** Discover cities from business + influencer seed locations. */
export function listCities(): City[] {
  const seed = createSeedData();
  const seen = new Map<string, City>();

  for (const c of LAUNCH_PRIORITY) {
    seen.set(c.slug, c);
  }

  const allLocations: string[] = [
    ...seed.businesses.map((b) => b.location ?? "").filter(Boolean),
    ...seed.influencers.map((i) => i.location ?? "").filter(Boolean),
  ];

  for (const loc of allLocations) {
    const parsed = parseLocation(loc);
    if (!parsed) continue;
    const slug = parsed.state
      ? `${toSlug(parsed.name)}-${parsed.state.toLowerCase()}`
      : toSlug(parsed.name);
    if (seen.has(slug)) continue;
    seen.set(slug, { slug, name: parsed.name, state: parsed.state, priority: false });
  }

  return Array.from(seen.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function findCity(slug: string): City | null {
  return listCities().find((c) => c.slug === slug) ?? null;
}

/** Businesses whose seed `location` matches a given city slug. */
export function businessesInCity(citySlug: string) {
  const city = findCity(citySlug);
  if (!city) return [];
  const seed = createSeedData();
  return seed.businesses.filter((b) => {
    const parsed = parseLocation(b.location);
    if (!parsed) return false;
    const slug = parsed.state
      ? `${toSlug(parsed.name)}-${parsed.state.toLowerCase()}`
      : toSlug(parsed.name);
    return slug === city.slug;
  });
}

export function influencersInCity(citySlug: string) {
  const city = findCity(citySlug);
  if (!city) return [];
  const seed = createSeedData();
  return seed.influencers.filter((i) => {
    const parsed = parseLocation(i.location);
    if (!parsed) return false;
    const slug = parsed.state
      ? `${toSlug(parsed.name)}-${parsed.state.toLowerCase()}`
      : toSlug(parsed.name);
    return slug === city.slug;
  });
}
