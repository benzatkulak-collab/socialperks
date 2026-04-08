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

export {
  emailQueue,
  verificationQueue,
  payoutQueue,
  analyticsQueue,
  allQueues,
  getQueueByName,
  startAllQueues,
  stopAllQueues,
} from "./registry";
