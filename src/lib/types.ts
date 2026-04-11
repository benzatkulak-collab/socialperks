// Re-export shared package types (preserves existing imports)
export * from "@social-perks/shared/types";

// Also re-export the central type registry so consumers can get
// engine-specific types from `@/lib/types` as well.
export * from "./types/index";
