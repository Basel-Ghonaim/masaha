import { useCopy } from '@shared/copy';
import { Badge, Button, Card, CardContent } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { CustomerFileView } from '../../hooks/file/useCustomerFile';
import { BalanceBadge } from '../card/BalanceBadge';

/**
 * The file's header, under the page's title (the customer's name, the top bar's `h1`): their phone
 * left to right, or that they gave none; who is here, «حاضر منذ {time}»; the current subscription's status; the
 * balance from the one badge (DI-40); the archive; while they owe and have a phone, «تذكير على
 * واتساب», a link opening WhatsApp, with its caption (D8.2); and the customer's actions at its end
 * (DK-013), a group of their own.
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
        {header.here !== null && <Badge variant="info">{header.here}</Badge>}
        {header.status !== null && (
          <Badge variant={header.status.tone}>{header.status.label}</Badge>
        )}
        {header.archived !== null && <Badge variant="neutral">{header.archived}</Badge>}
        <span className="flex items-center gap-2 text-body-sm">
          <span className="text-muted-foreground">{header.balance.label}</span>
          <BalanceBadge balance={header.balance.view} />
        </span>
        {header.reminder !== null && (
          <span className="flex flex-col items-start gap-1">
            <Button asChild variant="outline" size="sm">
              <a href={header.reminder.href} target="_blank" rel="noopener">
                {header.reminder.label}
              </a>
            </Button>
            <span className="text-caption text-muted-foreground">{header.reminder.caption}</span>
          </span>
        )}
        <div role="group" aria-label={label} className="ms-auto flex flex-wrap items-center gap-2">
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}
