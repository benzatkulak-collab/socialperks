// ══════════════════════════════════════════════════════════════════════════════
// Hooks — Barrel Export
//
// Re-exports every custom hook so consumers can import from a single path:
//   import { useLocalStorage, useAuth, useCampaigns } from '@/lib/hooks';
// ══════════════════════════════════════════════════════════════════════════════

export { useLocalStorage } from './use-store';
export { useBusinessDashboard } from './use-business-dashboard';
export { useSubmissions } from './use-submissions';
export type { Submission } from './use-submissions';
export { useKeyboardShortcuts } from './use-keyboard-shortcuts';
export { useTheme } from './use-theme';
export { useApi } from './use-api';
export { useAuth } from './use-auth';
export { useCampaigns } from './use-campaigns';
export { useNotifications } from './use-notifications';
export type { Notification, NotificationType } from './use-notifications';
export { useNotificationsSSE } from './use-notifications-sse';
export type { SSENotification } from './use-notifications-sse';
export { useRealtime } from './use-realtime';
export type { RealtimeEvent } from './use-realtime';
export { useInView } from './use-in-view';
export { useEnterpriseData } from './use-enterprise-data';
export type { EnterpriseDataResult } from './use-enterprise-data';
export { useOffline } from './use-offline';
export type { UseOfflineResult } from './use-offline';
export { useExperiment } from './use-experiment';
