import type { SubscriptionStatus } from '@masaha/shared/subscriptions';

// A customer's current subscription, the one the customers list shows (step 8's plan, D4): pure, so
// the row and the list's status and kind filters agree. Two may run at once (the owner's decision 2).

/** The order of the statuses: a running one first, then an upcoming one, then an expired one. */
const RANK: Record<SubscriptionStatus, number> = {
  ACTIVE: 0,
  ENDING_SOON: 0,
  UPCOMING: 1,
  EXPIRED: 2,
};

/** What the choice reads of a subscription. */
export interface Candidate {
  id: number;
  status: SubscriptionStatus;
  startsOn: string | null;
}

/**
 * The current one of a customer's subscriptions: the first by status (running, upcoming, expired),
 * then the latest start (none last), then the highest id; `null` with none.
 */
export function currentSubscription<T extends Candidate>(subscriptions: readonly T[]): T | null {
  let current: T | null = null;
  for (const candidate of subscriptions) {
    if (current === null || before(candidate, current)) current = candidate;
  }
  return current;
}

/** Whether `a` comes before `b`. */
function before(a: Candidate, b: Candidate): boolean {
  if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] < RANK[b.status];
  if (a.startsOn !== b.startsOn) {
    if (a.startsOn === null) return false;
    if (b.startsOn === null) return true;
    return a.startsOn > b.startsOn;
  }
  return a.id > b.id;
}
