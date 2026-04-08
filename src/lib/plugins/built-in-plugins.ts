// ══════════════════════════════════════════════════════════════════════════════
// Built-in Plugins — FTC Compliance & Slack Notifications
// ══════════════════════════════════════════════════════════════════════════════

import type {
  HookName,
  HookPayload,
  HookResult,
  PluginContext,
  PluginHookHandler,
  PluginManifest,
} from "./types";
import { PluginManager, type PluginManagerOptions } from "./manager";

// ─── 1. FTC Compliance Plugin ───────────────────────────────────────────────

const FTC_REQUIRED_DISCLOSURES: Record<string, string[]> = {
  instagram: ["#ad", "#sponsored"],
  tiktok: ["#ad", "#sponsored"],
  youtube: ["Includes paid promotion"],
  twitter: ["#ad", "#sponsored"],
  facebook: ["#ad", "#sponsored"],
  linkedin: ["#ad", "#sponsored"],
  pinterest: ["#ad"],
  snapchat: ["#ad"],
  reddit: ["Disclosure: received perk"],
  google_reviews: ["Disclosure: received a perk in exchange for this review"],
  yelp: ["Disclosure: received a perk in exchange for this review"],
  tripadvisor: ["Disclosure: received a perk in exchange for this review"],
  nextdoor: ["Disclosure: received a perk in exchange for this recommendation"],
  threads: ["#ad", "#sponsored"],
};

const FTC_COMPLIANCE_MANIFEST: PluginManifest = {
  id: "ftc-compliance",
  name: "FTC Compliance Checker",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Automatically checks all campaign submissions for FTC compliance. " +
    "Ensures required disclosures (#ad, #sponsored, etc.) are present based on " +
    "the platform. Injects missing disclosures and flags non-compliant submissions. " +
    "This plugin should always remain active — FTC compliance is mandatory.",
  permissions: [
    "campaigns:read",
    "submissions:read",
    "submissions:write",
    "storage:read",
    "storage:write",
  ],
  hooks: [
    "submission:before_create",
    "submission:before_review",
    "campaign:before_launch",
  ],
  config: {
    strictMode: {
      type: "boolean",
      default: true,
      description: "When true, block non-compliant submissions instead of just flagging them",
      required: false,
    },
    autoInjectDisclosures: {
      type: "boolean",
      default: true,
      description: "Automatically add missing disclosures to submission data",
      required: false,
    },
    customDisclosureText: {
      type: "string",
      default: "",
      description: "Additional disclosure text to require on all submissions",
      required: false,
    },
  },
  dependencies: [],
  minPlatformVersion: "^1.0.0",
};

function createFTCComplianceHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  const checkCompliance: PluginHookHandler = async (
    context: PluginContext,
    payload: HookPayload
  ): Promise<HookResult> => {
    const { data } = payload;
    const errors: string[] = [];

    const platform = (data.platform as string) ?? "";
    const content = (data.content as string) ?? "";
    const existingDisclosures = ((data.disclosures as string[]) ?? []).map((d) =>
      d.toLowerCase().trim()
    );

    const requiredDisclosures = FTC_REQUIRED_DISCLOSURES[platform.toLowerCase()] ?? [];
    const missingDisclosures: string[] = [];

    for (const required of requiredDisclosures) {
      const requiredLower = required.toLowerCase();
      const hasInDisclosures = existingDisclosures.some((d) => d.includes(requiredLower));
      const hasInContent = content.toLowerCase().includes(requiredLower);

      if (!hasInDisclosures && !hasInContent) {
        missingDisclosures.push(required);
      }
    }

    const submissionType = (data.type as string) ?? "";
    if (submissionType === "review" || submissionType === "rating") {
      const reviewDisclosure = "Disclosure: received a perk in exchange for this review";
      if (
        !existingDisclosures.includes(reviewDisclosure.toLowerCase()) &&
        !content.toLowerCase().includes(reviewDisclosure.toLowerCase())
      ) {
        missingDisclosures.push(reviewDisclosure);
      }
    }

    const strictMode = context.config.strictMode as boolean;
    const autoInject = context.config.autoInjectDisclosures as boolean;

    if (missingDisclosures.length > 0) {
      const message = `Missing FTC disclosures for ${platform}: ${missingDisclosures.join(", ")}`;
      context.logger.warn(message);

      if (strictMode && !autoInject) {
        errors.push(message);
      }
    }

    const updatedData: Record<string, unknown> = {
      _ftcChecked: true,
      _ftcCheckedAt: new Date().toISOString(),
      _ftcPlatform: platform,
    };

    if (missingDisclosures.length > 0 && autoInject) {
      const allDisclosures = [
        ...((data.disclosures as string[]) ?? []),
        ...missingDisclosures,
      ];
      updatedData.disclosures = allDisclosures;
      updatedData._ftcAutoInjected = missingDisclosures;
      context.logger.info(
        `Auto-injected ${missingDisclosures.length} disclosure(s) for ${platform}`
      );
    }

    if (missingDisclosures.length > 0) {
      updatedData._ftcMissingDisclosures = missingDisclosures;
      updatedData._ftcCompliant = false;
    } else {
      updatedData._ftcCompliant = true;
    }

    try {
      const statsKey = `compliance_stats_${platform}`;
      const existing = (await context.storage.get<{
        checked: number;
        compliant: number;
        autoInjected: number;
      }>(statsKey)) ?? { checked: 0, compliant: 0, autoInjected: 0 };

      await context.storage.set(statsKey, {
        checked: existing.checked + 1,
        compliant: existing.compliant + (missingDisclosures.length === 0 ? 1 : 0),
        autoInjected:
          existing.autoInjected + (autoInject ? missingDisclosures.length : 0),
      });
    } catch (storageErr) {
      context.logger.warn(
        `Failed to update compliance stats: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`
      );
    }

    return {
      modified: missingDisclosures.length > 0 && autoInject,
      data: updatedData,
      errors,
    };
  };

  const checkCampaignLaunch: PluginHookHandler = async (
    context: PluginContext,
    payload: HookPayload
  ): Promise<HookResult> => {
    const { data } = payload;
    const errors: string[] = [];

    const name = (data.name as string) ?? "";
    const description = (data.description as string) ?? "";
    const guidelines = (data.guidelines as string) ?? "";
    const actions = (data.actions as string[]) ?? [];

    if (!name.trim()) {
      errors.push("Campaign must have a name before launch");
    }

    if (!description.trim()) {
      errors.push("Campaign must have a description before launch");
    }

    const platformsInvolved = new Set<string>();
    for (const actionId of actions) {
      const platformId = actionId.split("_")[0];
      if (platformId) platformsInvolved.add(platformId);
    }

    const needsDisclosure = [...platformsInvolved].some(
      (pid) => FTC_REQUIRED_DISCLOSURES[pid]?.length ?? 0 > 0
    );

    if (needsDisclosure && guidelines.length > 0) {
      const guidelinesLower = guidelines.toLowerCase();
      if (
        !guidelinesLower.includes("disclose") &&
        !guidelinesLower.includes("#ad") &&
        !guidelinesLower.includes("ftc") &&
        !guidelinesLower.includes("sponsored")
      ) {
        const updatedGuidelines =
          guidelines +
          "\n\nFTC REQUIRED: All posts must include appropriate disclosure " +
          "(#ad, #sponsored) per FTC guidelines.";

        context.logger.info("Auto-appended FTC disclosure requirement to campaign guidelines");

        return {
          modified: true,
          data: {
            guidelines: updatedGuidelines,
            _ftcGuidelinesUpdated: true,
          },
          errors,
        };
      }
    }

    return {
      modified: false,
      data: { _ftcCampaignChecked: true },
      errors,
    };
  };

  return {
    "submission:before_create": checkCompliance,
    "submission:before_review": checkCompliance,
    "campaign:before_launch": checkCampaignLaunch,
  };
}

// ─── 2. Slack Notification Plugin ───────────────────────────────────────────

const SLACK_NOTIFICATION_MANIFEST: PluginManifest = {
  id: "slack-notifications",
  name: "Slack Notifications",
  version: "1.0.0",
  author: "Social Perks",
  description:
    "Sends real-time Slack notifications when key campaign events occur. " +
    "Notifies on campaign launches, new submissions, submission reviews, " +
    "and perk redemptions. Configurable webhook URL and channel.",
  permissions: [
    "campaigns:read",
    "submissions:read",
    "notifications:send",
    "webhooks:register",
    "storage:read",
    "storage:write",
  ],
  hooks: [
    "campaign:after_create",
    "campaign:after_launch",
    "submission:after_create",
    "submission:after_review",
    "perk:after_redeem",
  ],
  config: {
    webhookUrl: {
      type: "string",
      default: "",
      description: "Slack Incoming Webhook URL",
      required: true,
    },
    channel: {
      type: "string",
      default: "#social-perks",
      description: "Slack channel to post notifications to",
      required: false,
    },
    notifyOnCreate: {
      type: "boolean",
      default: true,
      description: "Send notification when a campaign is created",
      required: false,
    },
    notifyOnLaunch: {
      type: "boolean",
      default: true,
      description: "Send notification when a campaign is launched",
      required: false,
    },
    notifyOnSubmission: {
      type: "boolean",
      default: true,
      description: "Send notification when a new submission arrives",
      required: false,
    },
    notifyOnReview: {
      type: "boolean",
      default: true,
      description: "Send notification when a submission is reviewed",
      required: false,
    },
    notifyOnRedeem: {
      type: "boolean",
      default: false,
      description: "Send notification when a perk is redeemed",
      required: false,
    },
    mentionUsers: {
      type: "boolean",
      default: false,
      description: "Include @channel mention for high-priority events",
      required: false,
    },
  },
  dependencies: [],
  minPlatformVersion: "^1.0.0",
};

interface SlackMessage {
  channel: string;
  text: string;
  emoji: string;
  priority: "low" | "normal" | "high";
}

function createSlackNotificationHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  const queueSlackMessage = async (
    context: PluginContext,
    message: SlackMessage
  ): Promise<void> => {
    const webhookUrl = context.config.webhookUrl as string;
    const mentionUsers = context.config.mentionUsers as boolean;

    const fullText = mentionUsers && message.priority === "high"
      ? `<!channel> ${message.emoji} ${message.text}`
      : `${message.emoji} ${message.text}`;

    context.logger.info(`Slack [${message.channel}]: ${fullText}`);

    if (webhookUrl) {
      context.logger.debug(`Would POST to ${webhookUrl}`, {
        channel: message.channel,
        text: fullText,
      });
    }

    try {
      const historyKey = "message_history";
      const history = (await context.storage.get<SlackMessage[]>(historyKey)) ?? [];
      history.push(message);
      const trimmed = history.slice(-100);
      await context.storage.set(historyKey, trimmed);

      const countKey = "total_sent";
      const count = (await context.storage.get<number>(countKey)) ?? 0;
      await context.storage.set(countKey, count + 1);
    } catch (storageErr) {
      context.logger.warn(
        `Failed to store message history: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`
      );
    }
  };

  const makePassthroughResult = (): HookResult => ({
    modified: false,
    data: {},
    errors: [],
  });

  const onCampaignCreated: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnCreate as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const name = (payload.data.name as string) ?? "Unnamed campaign";
    const businessName = (payload.data.businessName as string) ?? "Unknown business";

    await queueSlackMessage(context, {
      channel,
      text: `New campaign created: *${name}* by ${businessName}`,
      emoji: ":sparkles:",
      priority: "normal",
    });

    return makePassthroughResult();
  };

  const onCampaignLaunched: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnLaunch as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const name = (payload.data.name as string) ?? "Unnamed campaign";
    const businessName = (payload.data.businessName as string) ?? "Unknown business";
    const budget = (payload.data.budget as number) ?? 0;

    await queueSlackMessage(context, {
      channel,
      text: `Campaign launched: *${name}* by ${businessName} (budget: $${budget.toLocaleString()})`,
      emoji: ":rocket:",
      priority: "high",
    });

    return makePassthroughResult();
  };

  const onSubmissionCreated: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnSubmission as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const campaignName = (payload.data.campaignName as string) ?? "Unknown campaign";
    const creatorName = (payload.data.creatorName as string) ?? "Unknown creator";
    const platform = (payload.data.platform as string) ?? "Unknown platform";

    await queueSlackMessage(context, {
      channel,
      text: `New submission on *${campaignName}* from ${creatorName} (${platform})`,
      emoji: ":inbox_tray:",
      priority: "normal",
    });

    return makePassthroughResult();
  };

  const onSubmissionReviewed: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnReview as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const campaignName = (payload.data.campaignName as string) ?? "Unknown campaign";
    const creatorName = (payload.data.creatorName as string) ?? "Unknown creator";
    const status = (payload.data.reviewStatus as string) ?? "unknown";
    const emoji = status === "approved" ? ":white_check_mark:" : ":x:";

    await queueSlackMessage(context, {
      channel,
      text: `Submission ${status}: *${campaignName}* by ${creatorName}`,
      emoji,
      priority: status === "rejected" ? "high" : "normal",
    });

    return makePassthroughResult();
  };

  const onPerkRedeemed: PluginHookHandler = async (context, payload) => {
    if (!(context.config.notifyOnRedeem as boolean)) return makePassthroughResult();

    const channel = context.config.channel as string;
    const perkName = (payload.data.perkName as string) ?? "Unknown perk";
    const userName = (payload.data.userName as string) ?? "Unknown user";
    const value = (payload.data.value as number) ?? 0;

    await queueSlackMessage(context, {
      channel,
      text: `Perk redeemed: ${userName} used *${perkName}* ($${value.toFixed(2)})`,
      emoji: ":gift:",
      priority: "low",
    });

    return makePassthroughResult();
  };

  return {
    "campaign:after_create": onCampaignCreated,
    "campaign:after_launch": onCampaignLaunched,
    "submission:after_create": onSubmissionCreated,
    "submission:after_review": onSubmissionReviewed,
    "perk:after_redeem": onPerkRedeemed,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory Functions — Create and register built-in plugins
// ══════════════════════════════════════════════════════════════════════════════

export function createPluginManager(
  options: PluginManagerOptions = {}
): PluginManager {
  const manager = new PluginManager(options);

  manager.install(FTC_COMPLIANCE_MANIFEST, createFTCComplianceHandlers(), {
    "submission:before_create": 10,
    "submission:before_review": 10,
    "campaign:before_launch": 10,
  });
  manager.enable("ftc-compliance");

  manager.install(SLACK_NOTIFICATION_MANIFEST, createSlackNotificationHandlers(), {
    "campaign:after_create": 900,
    "campaign:after_launch": 900,
    "submission:after_create": 900,
    "submission:after_review": 900,
    "perk:after_redeem": 900,
  });
  manager.enable("slack-notifications");

  return manager;
}

export function getFTCComplianceManifest(): PluginManifest {
  return { ...FTC_COMPLIANCE_MANIFEST };
}

export function getFTCComplianceHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  return createFTCComplianceHandlers();
}

export function getSlackNotificationManifest(): PluginManifest {
  return { ...SLACK_NOTIFICATION_MANIFEST };
}

export function getSlackNotificationHandlers(): Partial<Record<HookName, PluginHookHandler>> {
  return createSlackNotificationHandlers();
}
