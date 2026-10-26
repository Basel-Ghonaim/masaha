import type { Customer } from '@masaha/shared/customers';
import type { SubscriptionState } from '@masaha/shared/subscriptions';

/**
 * Where the subscription sheet opens, with what its entry knows: a new customer (a typed name or
 * phone, from the desk's search), a known customer's new subscription, with what they owe as the
 * entry read it (their file, read when the sheet opens, says it again), or the renewal of one of
 * their subscriptions.
 */
export type SheetEntry =
  | { mode: 'new'; name?: string; phone?: string }
  | { mode: 'subscribe'; customer: Customer & { debtAgorot: number } }
  | { mode: 'renew'; customer: Customer & { debtAgorot: number }; renews: SubscriptionState };

/**
 * Opens the page's subscription sheet for `entry`; `from` is the control the focus returns to once it
 * closes (a menu's trigger when it opened from one of its items, which leave the page).
 */
export type OpenSheet = (entry: SheetEntry, from: HTMLElement | null) => void;
