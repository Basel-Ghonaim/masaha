import type { SubscriptionStatus } from '@masaha/shared/subscriptions';

/** A subscription's status, worded, with the badge's tone. */
export type StatusView = { label: string; tone: 'info' | 'success' | 'warning' | 'neutral' };

const TONES: Record<SubscriptionStatus, StatusView['tone']> = {
  UPCOMING: 'info',
  ACTIVE: 'success',
  ENDING_SOON: 'warning',
  EXPIRED: 'neutral',
};

/** A subscription's status as its badge says it: its word, and a tone that only repeats it. */
export function statusView(
  status: SubscriptionStatus,
  labels: Record<SubscriptionStatus, string>,
): StatusView {
  return { label: labels[status], tone: TONES[status] };
}
