import { showToast, dismissToast } from '@/components/ui/toast';
import type { Toast } from '@/components/ui/toast';

export function useToast() {
  return {
    toast: (type: Toast['type'], message: string, duration?: number) => showToast(type, message, duration),
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
    dismiss: dismissToast,
  };
}
