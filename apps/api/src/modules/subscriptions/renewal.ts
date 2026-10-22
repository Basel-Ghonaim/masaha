import { addDays } from '@masaha/shared/core';
import type { SubscriptionState } from '@masaha/shared/subscriptions';

// A renewal's start date (docs/architecture/data-model.md › A renewal), proposed by the server: pure,
// so the desk's statement and its subscribe propose the same day.

/**
 * The day a renewal of `renewed` starts when the desk sends none: the day after its end while it is
 * not expired (running or upcoming) and has an end not before today; else today, as for no renewed
 * one at all.
 */
export function proposedStart(
  renewed: Pick<SubscriptionState, 'status' | 'endsOn'> | null,
  today: string,
): string {
  if (!renewed || renewed.status === 'EXPIRED' || renewed.endsOn === null) return today;
  return renewed.endsOn < today ? today : addDays(renewed.endsOn, 1);
}
