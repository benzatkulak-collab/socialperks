/**
 * Agent registry bootstrap.
 *
 * Importing this module registers every built-in agent with the
 * registry. Any module that needs to interact with agents should
 * import from here so the side-effecting registration always runs.
 */

import { agentRegistry } from "./registry";
import { submissionReviewerAgent } from "./submission-reviewer";
import { fraudSentinelAgent } from "./fraud-sentinel";
import { billingRecoveryAgent } from "./billing-recovery";
import { campaignOptimizerAgent } from "./campaign-optimizer";
import { matchingAgent } from "./matching-agent";
import { complianceWatchdogAgent } from "./compliance-watchdog";
import { outreachAgent } from "./outreach-agent";
import { supportTriageAgent } from "./support-triage";
import { payoutRunnerAgent } from "./payout-runner";
import { anomalyDetectorAgent } from "./anomaly-detector";
import { acquisitionAgent } from "./acquisition-agent";

// Original three
agentRegistry.register(submissionReviewerAgent);
agentRegistry.register(fraudSentinelAgent);
agentRegistry.register(billingRecoveryAgent);

// Additional ecosystem agents
agentRegistry.register(campaignOptimizerAgent);
agentRegistry.register(matchingAgent);
agentRegistry.register(complianceWatchdogAgent);
agentRegistry.register(outreachAgent);
agentRegistry.register(supportTriageAgent);
agentRegistry.register(payoutRunnerAgent);
agentRegistry.register(anomalyDetectorAgent);
agentRegistry.register(acquisitionAgent);

export { agentRegistry };
export type { Agent, AgentDecision, AgentMode, AgentRunReport, AgentState } from "./types";
