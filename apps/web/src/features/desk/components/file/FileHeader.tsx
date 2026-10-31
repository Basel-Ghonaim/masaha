import { useCopy } from '@shared/copy';
import { Badge, Card, CardContent } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { CustomerFileView } from '../../hooks/file/useCustomerFile';
import { BalanceBadge } from '../card/BalanceBadge';

/**
 * The file's header, under the page's title (the customer's name, the top bar's `h1`): their phone
 * left to right, or that they gave none; who is here now; the current subscription's status; the
 * balance from the one badge (DI-40); the archive; and the customer's actions at its end (DK-013),
 * a group of their own.
 */
export function FileHeader({
  header,
  actions,
}: {
  header: NonNullable<CustomerFileView['header']>;
  actions: ReactNode;
}) {
  const label = useCopy().desk.customers.columns.actions;
  return (
    <Card>
      <CardContent className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-body-sm text-muted-foreground">
          {header.phone.number ? <span dir="ltr">{header.phone.text}</span> : header.phone.text}
        </span>
        {header.here !== null && <Badge variant="success">{header.here}</Badge>}
        {header.status !== null && (
          <Badge variant={header.status.tone}>{header.status.label}</Badge>
        )}
        {header.archived !== null && <Badge variant="neutral">{header.archived}</Badge>}
        <span className="flex items-center gap-2 text-body-sm">
          <span className="text-muted-foreground">{header.balance.label}</span>
          <BalanceBadge balance={header.balance.view} />
        </span>
        <div role="group" aria-label={label} className="ms-auto flex flex-wrap items-center gap-2">
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}
