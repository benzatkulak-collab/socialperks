import { businessRepo, userRepo, influencerRepo } from "./repositories";
import { hashPassword } from "@/lib/auth";
import { createSeedData } from "@/lib/seed";

let seeded = false;

export async function seedDatabase(): Promise<void> {
  if (seeded) return;
  seeded = true;

  // Check if data already exists
  const existingBusinesses = await businessRepo.findMany({}, { perPage: 1 });
  if (existingBusinesses.total > 0) {
    console.info("[Seed] Database already has data, skipping seed");
    return;
  }

  console.info("[Seed] Seeding database with demo data...");
  const seed = createSeedData();
  const passwordHash = await hashPassword("1234");

  // Seed businesses + users
  for (const biz of seed.businesses) {
    try {
      const business = await businessRepo.create({
        name: biz.name,
        type: biz.type,
        email: biz.email,
        pin: biz.pin,
        avatar: biz.avatar,
        size: biz.size as "solo" | "small" | "medium" | "enterprise",
        location: biz.location,
        industry: biz.industry,
      });

      await userRepo.create({
        email: biz.email,
        name: biz.name,
        password_hash: passwordHash,
        role: "business_owner",
        business_id: business.id,
      });
    } catch (err) {
      console.warn(`[Seed] Failed to seed business ${biz.name}:`, err);
    }
  }

  // Seed influencers + users (create user first to get a valid UUID for user_id)
  for (const inf of seed.influencers) {
    try {
      const user = await userRepo.create({
        email: inf.email,
        name: inf.displayName,
        password_hash: passwordHash,
        role: "influencer",
      });

      const influencer = await influencerRepo.create({
        user_id: user.id,
        display_name: inf.displayName,
        bio: inf.bio,
        follower_count: inf.followerCount,
        engagement_rate: inf.engagementRate,
        niches: inf.niches,
        location: inf.location,
        tier: inf.tier as "micro" | "mid" | "macro" | "mega",
      });

      // Link influencer back to user
      await userRepo.update(user.id, { influencer_id: influencer.id });
    } catch (err) {
      console.warn(`[Seed] Failed to seed influencer ${inf.displayName}:`, err);
    }
  }

  // NOTE: campaign seeding was removed. It wrote to the dead v1
  // `launched_campaigns` table via the (now-deleted) CampaignRepository; the
  // live read path is the campaign state machine backed by
  // `launched_campaign_state`, so seeded rows never surfaced anywhere. Demo
  // campaigns, if needed, should be launched through campaignManager +
  // persistLifecycle() (src/lib/campaign-state-machine/persist.ts).

  console.info("[Seed] Database seeded successfully");
}
