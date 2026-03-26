import { businessRepo, userRepo, influencerRepo, campaignRepo } from "./repositories";
import { hashPassword } from "../auth";
import { createSeedData } from "../seed";

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

  // Seed a few campaigns per business
  const businessList = await businessRepo.findMany({}, { perPage: 100 });
  const campaignTemplates = [
    { name: "Google Photos Campaign", description: "Upload photos of your visit to Google", actions: ["go_ph"], discount_value: 15, discount_type: "pct" as const },
    { name: "Instagram Story Feature", description: "Share your experience on Instagram Stories", actions: ["ig_st"], discount_value: 10, discount_type: "pct" as const },
    { name: "TikTok Video Review", description: "Create a short TikTok about your visit", actions: ["tt_vd"], discount_value: 20, discount_type: "pct" as const },
  ];

  for (const biz of businessList.data.slice(0, 5)) {
    for (const template of campaignTemplates) {
      try {
        await campaignRepo.create({
          business_id: biz.id,
          name: `${template.name} — ${biz.name}`,
          description: template.description,
          actions: template.actions,
          discount_value: template.discount_value,
          discount_type: template.discount_type,
          expires_in_days: 30,
          use_tiers: true,
        });
      } catch (err) {
        console.warn(`[Seed] Failed to seed campaign for ${biz.name}:`, err);
      }
    }
  }

  console.info("[Seed] Database seeded successfully");
}
