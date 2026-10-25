import { Card, CardHeader, CardTitle } from '@shared/design-system';
import { useId } from 'react';
import type { CustomerFileView } from '../../hooks/file/useCustomerFile';
import { UncollectedRow } from '../uncollected/UncollectedRow';

/**
 * «زيارات غير مدفوعة»: the customer's closed visits that still owe, the oldest first, each as
 * «غير محصّل» draws a row (DI-24) — when and how it closed, what it still owes, and «تحصيل» while it
 * has a price. `opened` hears which control opened the payment, so the focus goes back to it.
 */
export function UnpaidVisits({
  unpaid,
  opened,
}: {
  unpaid: NonNullable<CustomerFileView['unpaid']>;
  opened: (trigger: HTMLElement) => void;
}) {
  const headingId = useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{unpaid.title}</h2>
        </CardTitle>
      </CardHeader>
      <ul className="flex flex-col divide-y">
        {unpaid.rows.map((row) => (
          <UncollectedRow key={row.key} row={row} opened={opened} />
        ))}
      </ul>
    </Card>
  );
}
