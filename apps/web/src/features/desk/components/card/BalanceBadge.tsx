import { Badge } from '@shared/design-system';
import type { BalanceView } from '../../services/balanceView';

/**
 * A customer's balance, drawn one way everywhere (DI-40): «عليه {n}» a warning, «له رصيد {n}» a
 * success, «مسدّد» neutral. The word carries it; the colour only repeats it.
 */
export function BalanceBadge({ balance }: { balance: BalanceView }) {
  return <Badge variant={balance.tone}>{balance.label}</Badge>;
}
