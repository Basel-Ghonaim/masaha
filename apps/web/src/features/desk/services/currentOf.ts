import type { SubscriptionWithMoney } from '@masaha/shared/desk';

/**
 * The subscription a customer's file speaks of as theirs now: the one running, else the next, else
 * the latest (the file lists them the latest started first), as the customers list's row reads its
 * current one.
 */
export function currentOf(subscriptions: SubscriptionWithMoney[]): SubscriptionWithMoney | null {
  return (
    subscriptions.find(({ status }) => status === 'ACTIVE' || status === 'ENDING_SOON') ??
    subscriptions.find(({ status }) => status === 'UPCOMING') ??
    subscriptions[0] ??
    null
  );
}
