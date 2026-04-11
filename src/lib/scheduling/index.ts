/**
 * Campaign scheduling system.
 * Supports future launch dates and auto-pause dates.
 */

export interface ScheduledAction {
  id: string;
  campaignId: string;
  businessId: string;
  action: 'launch' | 'pause' | 'end';
  scheduledAt: string;
  executedAt?: string;
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: string;
}

const schedules = new Map<string, ScheduledAction>();

export function scheduleAction(campaignId: string, businessId: string, action: ScheduledAction['action'], scheduledAt: string): ScheduledAction {
  const schedule: ScheduledAction = {
    id: crypto.randomUUID(),
    campaignId,
    businessId,
    action,
    scheduledAt,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  schedules.set(schedule.id, schedule);
  return schedule;
}

export function getSchedules(campaignId: string): ScheduledAction[] {
  return Array.from(schedules.values()).filter(s => s.campaignId === campaignId);
}

export function cancelSchedule(id: string): boolean {
  const schedule = schedules.get(id);
  if (!schedule || schedule.status !== 'pending') return false;
  schedule.status = 'cancelled';
  return true;
}

export function getPendingSchedules(): ScheduledAction[] {
  const now = new Date().toISOString();
  return Array.from(schedules.values()).filter(s => s.status === 'pending' && s.scheduledAt <= now);
}

export function markExecuted(id: string): void {
  const schedule = schedules.get(id);
  if (schedule) {
    schedule.status = 'executed';
    schedule.executedAt = new Date().toISOString();
  }
}
