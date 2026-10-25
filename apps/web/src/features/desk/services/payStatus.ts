/** How much of a subscription is paid, with its badge's tone. */
export type PayStatus = {
  key: 'paid' | 'partial' | 'unpaid';
  tone: 'success' | 'warning' | 'destructive';
};

/**
 * A subscription's payment as its card's badge says it, from the server's money: paid once nothing
 * is owed (a usage-based one in credit too), partly paid once something was paid, else unpaid.
 */
export function payStatus({
  paidAgorot,
  balanceAgorot,
}: {
  paidAgorot: number;
  balanceAgorot: number;
}): PayStatus {
  if (balanceAgorot <= 0) return { key: 'paid', tone: 'success' };
  if (paidAgorot > 0) return { key: 'partial', tone: 'warning' };
  return { key: 'unpaid', tone: 'destructive' };
}
