import type { CustomerBalance } from '@masaha/shared/payments';

/** A customer's balance, worded, with the badge's tone (DI-40). */
export type BalanceView = { label: string; tone: 'warning' | 'success' | 'neutral' };

/**
 * A customer's balance as one badge says it everywhere (DI-40): what they owe, a warning; else what
 * a usage-based subscription holds paid ahead, a success; else settled, neutral. A debt is said
 * first: the server never offsets one with the other.
 */
export function balanceView(
  { debtAgorot, creditAgorot }: CustomerBalance,
  words: {
    owes: (values: { amount: string }) => string;
    credit: (values: { amount: string }) => string;
    settled: string;
  },
  price: (agorot: number) => string,
): BalanceView {
  if (debtAgorot > 0) return { label: words.owes({ amount: price(debtAgorot) }), tone: 'warning' };
  if (creditAgorot > 0) {
    return { label: words.credit({ amount: price(creditAgorot) }), tone: 'success' };
  }
  return { label: words.settled, tone: 'neutral' };
}
