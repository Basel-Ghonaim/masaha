import type { CustomerRow } from '@masaha/shared/desk';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useCustomerCard } from '../../hooks/card/useCustomerCard';
import { BalanceBadge } from './BalanceBadge';

/**
 * A customer found by the desk's search: their name, the card's `h3` under its group's `h2` (DI-38),
 * their phone left to right, their current subscription with its status and its end, and their
 * balance (DI-40).
 */
export function CustomerCard({ row }: { row: CustomerRow }) {
  const card = useCustomerCard(row);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {/* The name keeps its own direction inline, so the heading stays at the start (PR 1b). */}
          <h3>
            <span dir="auto">{card.name}</span>
          </h3>
        </CardTitle>
        <CardDescription>
          {card.phone.number ? <span dir="ltr">{card.phone.text}</span> : card.phone.text}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {card.subscription === null ? (
          <span className="text-body-sm text-muted-foreground">{card.noSubscription}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <span dir="auto">{card.subscription.name}</span>
            <Badge variant={card.subscription.status.tone}>{card.subscription.status.label}</Badge>
            <span className="text-muted-foreground">{card.subscription.until}</span>
          </div>
        )}
        <div>
          <BalanceBadge balance={card.balance} />
        </div>
      </CardContent>
    </Card>
  );
}
