/**
 * Prisma Database Seed Script
 *
 * Seeds the database with demo businesses, influencers, campaigns,
 * perk wallets, and supporting data. Uses upsert for idempotency
 * and $transaction for atomicity.
 *
 * Run: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Seed Data (mirrors packages/shared/src/seed.ts) ─────────────────────────

const DEMO_PASSWORD_HASH = crypto.createHash('sha256').update('1234').digest('hex');

const businesses = [
  { id: 'b1', name: 'Sunrise Yoga DC', type: 'Yoga Studio', email: 'yoga@demo.com', pin: '1234', avatar: '🧘', size: 'solo', location: 'Washington, DC', industry: 'Wellness' },
  { id: 'b2', name: 'Taqueria Sol', type: 'Restaurant', email: 'sol@demo.com', pin: '1234', avatar: '🌮', size: 'small', location: 'Washington, DC', industry: 'Food & Beverage' },
  { id: 'b3', name: 'Glow Studio', type: 'Salon', email: 'glow@demo.com', pin: '1234', avatar: '💇', size: 'small', location: 'Arlington, VA', industry: 'Beauty' },
  { id: 'b4', name: 'Iron Temple', type: 'Gym', email: 'iron@demo.com', pin: '1234', avatar: '🏋️', size: 'small', location: 'Bethesda, MD', industry: 'Fitness' },
  { id: 'b5', name: 'Baked & Wired', type: 'Coffee Shop', email: 'baked@demo.com', pin: '1234', avatar: '☕', size: 'small', location: 'Georgetown, DC', industry: 'Food & Beverage' },
  { id: 'b6', name: 'Ink Masters DC', type: 'Tattoo Parlor', email: 'ink@demo.com', pin: '1234', avatar: '🎨', size: 'solo', location: 'Adams Morgan, DC', industry: 'Art & Body' },
  { id: 'b7', name: 'Happy Paws Vet', type: 'Veterinarian', email: 'vet@demo.com', pin: '1234', avatar: '🐾', size: 'small', location: 'Silver Spring, MD', industry: 'Pet Care' },
  { id: 'b8', name: 'Bloom Florist', type: 'Florist', email: 'bloom@demo.com', pin: '1234', avatar: '💐', size: 'solo', location: 'Dupont Circle, DC', industry: 'Retail' },
  { id: 'b9', name: 'Smith & Co Law', type: 'Law Firm', email: 'smith@demo.com', pin: '1234', avatar: '⚖️', size: 'small', location: 'K Street, DC', industry: 'Professional Services' },
  { id: 'b10', name: 'Spark Auto', type: 'Auto Mechanic', email: 'spark@demo.com', pin: '1234', avatar: '🔧', size: 'small', location: 'Falls Church, VA', industry: 'Automotive' },
] as const;

const influencers = [
  {
    id: 'i1', displayName: 'Priya Eats DC', email: 'priya@demo.com', bio: 'Food blogger exploring the DC dining scene',
    tier: 'mid', niches: ['food', 'restaurants', 'local'], followerCount: 45000, engagementRate: 4.2,
    platforms: [{ platformId: 'ig', handle: '@priya.eats.dc', followers: 35000 }, { platformId: 'tt', handle: '@priyaeatsdc', followers: 10000 }],
    location: 'Washington, DC',
  },
  {
    id: 'i2', displayName: 'FitWithMarcus', email: 'marcus@demo.com', bio: 'Certified trainer & fitness content creator',
    tier: 'mid', niches: ['fitness', 'wellness', 'gym'], followerCount: 78000, engagementRate: 5.1,
    platforms: [{ platformId: 'ig', handle: '@fitwithmarcus', followers: 50000 }, { platformId: 'tt', handle: '@fitwithmarcus', followers: 28000 }],
    location: 'Arlington, VA',
  },
  {
    id: 'i3', displayName: 'DCStyleDiary', email: 'style@demo.com', bio: 'Fashion & lifestyle in the capital',
    tier: 'micro', niches: ['fashion', 'lifestyle', 'beauty'], followerCount: 8500, engagementRate: 6.8,
    platforms: [{ platformId: 'ig', handle: '@dcstylediary', followers: 8500 }],
    location: 'Washington, DC',
  },
  {
    id: 'i4', displayName: 'LocalLens Photography', email: 'photo@demo.com', bio: "Capturing DC's best businesses and hidden gems",
    tier: 'micro', niches: ['photography', 'local', 'food'], followerCount: 12000, engagementRate: 7.2,
    platforms: [{ platformId: 'ig', handle: '@locallens.dc', followers: 12000 }],
    location: 'Washington, DC',
  },
  {
    id: 'i5', displayName: 'TheWellnessWitch', email: 'wellness@demo.com', bio: 'Yoga, meditation & holistic wellness journey',
    tier: 'macro', niches: ['wellness', 'yoga', 'meditation', 'health'], followerCount: 230000, engagementRate: 3.4,
    platforms: [
      { platformId: 'ig', handle: '@thewellnesswitch', followers: 150000 },
      { platformId: 'tt', handle: '@wellnesswitch', followers: 60000 },
      { platformId: 'yt', handle: '@TheWellnessWitch', followers: 20000 },
    ],
    location: 'Bethesda, MD',
  },
] as const;

const campaignTemplates = [
  { name: 'Google Photos Campaign', description: 'Upload photos of your visit to Google', actions: ['go_ph'], discountValue: 15, discountType: 'pct', tier: 'essential', category: 'content' },
  { name: 'Instagram Story Feature', description: 'Share your experience on Instagram Stories', actions: ['ig_st'], discountValue: 10, discountType: 'pct', tier: 'high_impact', category: 'content' },
  { name: 'TikTok Video Review', description: 'Create a short TikTok about your visit', actions: ['tt_vd'], discountValue: 20, discountType: 'pct', tier: 'growth', category: 'content' },
] as const;

// ─── Deterministic UUIDs from seed IDs ───────────────────────────────────────

function seedUUID(prefix: string, id: string): string {
  const hash = crypto.createHash('sha256').update(`${prefix}:${id}`).digest('hex');
  // Format as UUID v4
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...\n');

  await prisma.$transaction(async (tx) => {
    // ── 1. Businesses ──────────────────────────────────────────────────────
    console.log('  [1/12] Seeding businesses...');
    for (const biz of businesses) {
      const bizId = seedUUID('business', biz.id);
      await tx.business.upsert({
        where: { email: biz.email },
        update: {
          name: biz.name,
          type: biz.type,
          pin: biz.pin,
          avatar: biz.avatar,
          size: biz.size,
          location: biz.location,
          industry: biz.industry,
        },
        create: {
          id: bizId,
          name: biz.name,
          type: biz.type,
          email: biz.email,
          pin: biz.pin,
          avatar: biz.avatar,
          size: biz.size,
          location: biz.location,
          industry: biz.industry,
        },
      });
    }
    console.log(`    ✓ ${businesses.length} businesses`);

    // ── 2. Business Owner Users ────────────────────────────────────────────
    console.log('  [2/12] Seeding business owner users...');
    for (const biz of businesses) {
      const userId = seedUUID('user-biz', biz.id);
      const bizRecord = await tx.business.findUnique({ where: { email: biz.email } });
      if (!bizRecord) continue;

      await tx.user.upsert({
        where: { email: biz.email },
        update: {
          name: biz.name,
          businessId: bizRecord.id,
          role: 'business_owner',
        },
        create: {
          id: userId,
          email: biz.email,
          name: biz.name,
          passwordHash: DEMO_PASSWORD_HASH,
          role: 'business_owner',
          businessId: bizRecord.id,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }
    console.log(`    ✓ ${businesses.length} business owner users`);

    // ── 3. Influencers ─────────────────────────────────────────────────────
    console.log('  [3/12] Seeding influencer users...');
    for (const inf of influencers) {
      const userId = seedUUID('user-inf', inf.id);
      await tx.user.upsert({
        where: { email: inf.email },
        update: { name: inf.displayName, role: 'influencer' },
        create: {
          id: userId,
          email: inf.email,
          name: inf.displayName,
          passwordHash: DEMO_PASSWORD_HASH,
          role: 'influencer',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }
    console.log(`    ✓ ${influencers.length} influencer users`);

    // ── 4. Influencer profiles ─────────────────────────────────────────────
    console.log('  [4/12] Seeding influencer profiles...');
    for (const inf of influencers) {
      const infId = seedUUID('influencer', inf.id);
      const user = await tx.user.findUnique({ where: { email: inf.email } });
      if (!user) continue;

      await tx.influencer.upsert({
        where: { userId: user.id },
        update: {
          displayName: inf.displayName,
          bio: inf.bio,
          followerCount: inf.followerCount,
          engagementRate: inf.engagementRate,
          niches: [...inf.niches],
          location: inf.location,
          tier: inf.tier,
        },
        create: {
          id: infId,
          userId: user.id,
          displayName: inf.displayName,
          bio: inf.bio,
          followerCount: inf.followerCount,
          engagementRate: inf.engagementRate,
          niches: [...inf.niches],
          location: inf.location,
          tier: inf.tier,
          verified: true,
        },
      });

      // Link influencer back to user
      const infRecord = await tx.influencer.findUnique({ where: { userId: user.id } });
      if (infRecord) {
        await tx.user.update({
          where: { id: user.id },
          data: { influencerId: infRecord.id },
        });
      }
    }
    console.log(`    ✓ ${influencers.length} influencer profiles`);

    // ── 5. Influencer Platforms ─────────────────────────────────────────────
    console.log('  [5/12] Seeding influencer platforms...');
    let platformCount = 0;
    for (const inf of influencers) {
      const user = await tx.user.findUnique({ where: { email: inf.email } });
      if (!user) continue;
      const infRecord = await tx.influencer.findUnique({ where: { userId: user.id } });
      if (!infRecord) continue;

      for (const plat of inf.platforms) {
        const platId = seedUUID('inf-plat', `${inf.id}-${plat.platformId}`);
        await tx.influencerPlatform.upsert({
          where: {
            influencer_platforms_influencer_platform_unique: {
              influencerId: infRecord.id,
              platformId: plat.platformId,
            },
          },
          update: {
            handle: plat.handle,
            followers: plat.followers,
            verified: true,
          },
          create: {
            id: platId,
            influencerId: infRecord.id,
            platformId: plat.platformId,
            handle: plat.handle,
            followers: plat.followers,
            engagementRate: inf.engagementRate,
            verified: true,
            profileUrl: `https://${plat.platformId === 'ig' ? 'instagram.com' : plat.platformId === 'tt' ? 'tiktok.com' : 'youtube.com'}/${plat.handle.replace('@', '')}`,
          },
        });
        platformCount++;
      }
    }
    console.log(`    ✓ ${platformCount} influencer platforms`);

    // ── 6. Campaign Templates (AI suggestions) ─────────────────────────────
    console.log('  [6/12] Seeding campaign templates...');
    for (const tmpl of campaignTemplates) {
      const campaignId = seedUUID('campaign', tmpl.name);
      await tx.campaign.upsert({
        where: { id: campaignId },
        update: {
          name: tmpl.name,
          description: tmpl.description,
        },
        create: {
          id: campaignId,
          name: tmpl.name,
          description: tmpl.description,
          actions: [...tmpl.actions],
          discountValue: tmpl.discountValue,
          discountType: tmpl.discountType,
          tier: tmpl.tier,
          category: tmpl.category,
          aiReason: `Recommended for local businesses to boost ${tmpl.category} engagement`,
        },
      });
    }
    console.log(`    ✓ ${campaignTemplates.length} campaign templates`);

    // ── 7. Launched Campaigns (first 5 businesses x 3 templates) ───────────
    console.log('  [7/12] Seeding launched campaigns...');
    let launchedCount = 0;
    const launchedBusinesses = businesses.slice(0, 5);
    for (const biz of launchedBusinesses) {
      const bizRecord = await tx.business.findUnique({ where: { email: biz.email } });
      if (!bizRecord) continue;

      for (const tmpl of campaignTemplates) {
        const lcId = seedUUID('launched', `${biz.id}-${tmpl.name}`);
        const campaignId = seedUUID('campaign', tmpl.name);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await tx.launchedCampaign.upsert({
          where: { id: lcId },
          update: {
            name: `${tmpl.name} — ${biz.name}`,
            description: tmpl.description,
            status: 'active',
          },
          create: {
            id: lcId,
            businessId: bizRecord.id,
            name: `${tmpl.name} — ${biz.name}`,
            description: tmpl.description,
            actions: [...tmpl.actions],
            discountValue: tmpl.discountValue,
            discountType: tmpl.discountType,
            expiresInDays: 30,
            useTiers: true,
            status: 'active',
            fromSuggestion: campaignId,
            ftcDisclosures: ['#ad', '#sponsored'],
            tags: [tmpl.category, biz.industry],
            expiresAt,
          },
        });
        launchedCount++;
      }
    }
    console.log(`    ✓ ${launchedCount} launched campaigns`);

    // ── 8. Campaign Submissions ────────────────────────────────────────────
    console.log('  [8/12] Seeding campaign submissions...');
    let submissionCount = 0;
    // First influencer submits to first business's campaigns
    const firstInf = influencers[0];
    const firstInfUser = await tx.user.findUnique({ where: { email: firstInf.email } });
    const firstBiz = await tx.business.findUnique({ where: { email: businesses[0].email } });

    if (firstInfUser && firstBiz) {
      const bizCampaigns = await tx.launchedCampaign.findMany({
        where: { businessId: firstBiz.id, status: 'active' },
        take: 2,
      });

      for (const campaign of bizCampaigns) {
        const subId = seedUUID('submission', `${firstInf.id}-${campaign.id}`);
        const actionId = campaign.actions[0] ?? 'ig_st';

        await tx.campaignSubmission.upsert({
          where: {
            campaign_submissions_unique_action: {
              campaignId: campaign.id,
              userId: firstInfUser.id,
              actionId,
            },
          },
          update: { status: 'approved', reviewNote: 'Demo submission auto-approved' },
          create: {
            id: subId,
            campaignId: campaign.id,
            userId: firstInfUser.id,
            actionId,
            proofUrl: `https://example.com/proof/${subId}`,
            proofType: 'url',
            status: 'approved',
            platformId: actionId.split('_')[0],
            autoVerified: true,
            reviewNote: 'Demo submission auto-approved',
            reviewedAt: new Date(),
          },
        });
        submissionCount++;
      }
    }
    console.log(`    ✓ ${submissionCount} campaign submissions`);

    // ── 9. Perk Wallets ────────────────────────────────────────────────────
    console.log('  [9/12] Seeding perk wallets...');
    let walletCount = 0;
    if (firstInfUser && firstBiz) {
      const walletId = seedUUID('wallet', `${firstInf.id}-${businesses[0].id}`);
      await tx.perkWallet.upsert({
        where: {
          perk_wallets_user_business_unique: {
            userId: firstInfUser.id,
            businessId: firstBiz.id,
          },
        },
        update: { totalAvailable: 25, totalLifetime: 45 },
        create: {
          id: walletId,
          userId: firstInfUser.id,
          businessId: firstBiz.id,
          totalAvailable: 25,
          totalLifetime: 45,
        },
      });
      walletCount++;
    }
    console.log(`    ✓ ${walletCount} perk wallets`);

    // ── 10. Earned Perks ───────────────────────────────────────────────────
    console.log('  [10/12] Seeding earned perks...');
    let perkCount = 0;
    if (firstInfUser && firstBiz) {
      const wallet = await tx.perkWallet.findUnique({
        where: {
          perk_wallets_user_business_unique: {
            userId: firstInfUser.id,
            businessId: firstBiz.id,
          },
        },
      });
      const campaigns = await tx.launchedCampaign.findMany({
        where: { businessId: firstBiz.id },
        take: 2,
      });

      if (wallet && campaigns.length > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        for (const campaign of campaigns) {
          const perkId = seedUUID('perk', `${firstInf.id}-${campaign.id}`);
          await tx.earnedPerk.upsert({
            where: { id: perkId },
            update: { status: 'available', value: campaign.discountValue },
            create: {
              id: perkId,
              walletId: wallet.id,
              campaignId: campaign.id,
              value: campaign.discountValue,
              type: campaign.discountType,
              status: 'available',
              description: `Perk from "${campaign.name}"`,
              redemptionCode: `DEMO-${perkId.slice(0, 8).toUpperCase()}`,
              expiresAt,
            },
          });
          perkCount++;
        }
      }
    }
    console.log(`    ✓ ${perkCount} earned perks`);

    // ── 11. API Keys ───────────────────────────────────────────────────────
    console.log('  [11/12] Seeding API keys...');
    const demoKeyHash = crypto.createHash('sha256').update('sp_demo_key_12345').digest('hex');
    const apiKeyId = seedUUID('apikey', 'demo');
    if (firstBiz) {
      await tx.apiKey.upsert({
        where: { keyHash: demoKeyHash },
        update: { agentName: 'Demo Agent', active: true },
        create: {
          id: apiKeyId,
          businessId: firstBiz.id,
          agentName: 'Demo Agent',
          keyHash: demoKeyHash,
          keyPrefix: 'sp_demo_',
          permissions: ['read', 'write'],
          rateLimit: 100,
          active: true,
        },
      });
    }
    console.log('    ✓ 1 API key');

    // ── 12. Webhooks ───────────────────────────────────────────────────────
    console.log('  [12/12] Seeding webhooks...');
    if (firstBiz) {
      const webhookId = seedUUID('webhook', 'demo');
      const webhookSecret = crypto.createHash('sha256').update('demo-webhook-secret').digest('hex');
      await tx.webhook.upsert({
        where: { id: webhookId },
        update: { url: 'https://example.com/webhook', active: true },
        create: {
          id: webhookId,
          businessId: firstBiz.id,
          url: 'https://example.com/webhook',
          events: ['submission.approved', 'campaign.completed', 'perk.earned'],
          active: true,
          secret: webhookSecret,
        },
      });
    }
    console.log('    ✓ 1 webhook');

    // ── 13. Notifications (bonus) ──────────────────────────────────────────
    console.log('  [bonus] Seeding notifications...');
    let notifCount = 0;
    if (firstInfUser) {
      const notifId = seedUUID('notif', 'welcome');
      await tx.notification.upsert({
        where: { id: notifId },
        update: { title: 'Welcome to Social Perks!' },
        create: {
          id: notifId,
          userId: firstInfUser.id,
          type: 'system',
          title: 'Welcome to Social Perks!',
          body: 'Start exploring campaigns and earning perks for your social media content.',
          read: false,
        },
      });
      notifCount++;
    }

    // Welcome notification for first business owner
    const firstBizUser = await tx.user.findUnique({ where: { email: businesses[0].email } });
    if (firstBizUser) {
      const notifId = seedUUID('notif', 'biz-welcome');
      await tx.notification.upsert({
        where: { id: notifId },
        update: { title: 'Welcome to Social Perks!' },
        create: {
          id: notifId,
          userId: firstBizUser.id,
          type: 'system',
          title: 'Welcome to Social Perks!',
          body: 'Create your first campaign and start turning customers into your marketing team.',
          read: false,
        },
      });
      notifCount++;
    }
    console.log(`    ✓ ${notifCount} notifications`);
  });

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
