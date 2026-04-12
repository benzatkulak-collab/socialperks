/**
 * Job Queue — barrel export
 *
 * Re-exports the core queue class and all pre-configured application queues.
 */

export { JobQueue } from "./queue";
export type {
  Job,
  JobStatus,
  JobProcessor,
  AddJobOptions,
  QueueOptions,
  QueueStats,
  BackoffStrategy,
} from "./queue";

export { BullMQAdapter } from "./bullmq-adapter";

export {
  createQueue,
  emailQueue,
  verificationQueue,
  payoutQueue,
  analyticsQueue,
  webhookQueue,
  allQueues,
  getQueueByName,
  startAllQueues,
  stopAllQueues,
  registerWebhookQueue,
  getWebhookRetryQueue,
} from "./registry";
