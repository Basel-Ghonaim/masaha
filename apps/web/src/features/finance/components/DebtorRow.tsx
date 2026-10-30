import { Badge, Button } from '@shared/design-system';
import { Link } from 'react-router';
import type { DebtsTabView } from '../hooks/debts/useDebtsTab';

type Debtor = Extract<DebtsTabView, { state: 'ready' }>['owes']['rows'][number];

/**
 * One customer who owes: the name, a link to the file, «مؤرشف» when archived; since when and the
 * oldest item; then what is owed, the WhatsApp reminder when there is a phone, and «استلام دفعة»,
 * which opens the file (DI15). A column below 768 px, a row from it.
 */
export function DebtorRow({ debtor }: { debtor: Debtor }) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to={debtor.href}
            className="text-label underline-offset-4 hover:underline"
            dir="auto"
          >
            {debtor.name}
          </Link>
          {debtor.archived !== null && <Badge>{debtor.archived}</Badge>}
        </span>
        {debtor.since !== null && (
          <span className="text-caption text-muted-foreground">{debtor.since}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">{debtor.amount}</Badge>
        {debtor.whatsapp !== null && (
          <Button asChild variant="ghost" size="sm">
            <a href={debtor.whatsapp.href} target="_blank" rel="noopener">
              {debtor.whatsapp.label}
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link to={debtor.receive.href}>{debtor.receive.label}</Link>
        </Button>
      </div>
    </li>
  );
}
