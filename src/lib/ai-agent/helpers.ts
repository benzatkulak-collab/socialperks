/**
 * AI Marketing Campaign Agent — Shared Helpers
 *
 * Small utility functions used across the agent sub-modules.
 */

import { PLATFORMS } from "../platforms";

export const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export function findPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}

export function findAction(platformId: string, actionId: string) {
  const platform = findPlatform(platformId);
  if (!platform) return null;
  return platform.actions.find((a) => a.id === actionId) ?? null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
