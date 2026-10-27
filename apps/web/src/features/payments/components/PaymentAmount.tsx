import { Badge } from '@shared/design-system';
import type { PaymentRowView } from '../types/PaymentRowView';

/**
 * A payment's amount with its method under it; voided, the amount struck through and muted, a
 * visible «ملغاة», and who voided it and why under it (DI-6) — never told by the strike alone. A list
 * that shows the method beside it leaves it out here (`withMethod`).
 */
export function PaymentAmount({
  row,
  withMethod = true,
}: {
  row: PaymentRowView;
  withMethod?: boolean;
}) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={
            row.voided === null ? 'text-label' : 'text-label text-muted-foreground line-through'
          }
        >
          {row.amount}
        </span>
        {row.voided !== null && <Badge variant="neutral">{row.voided.label}</Badge>}
      </span>
      {withMethod && <span className="text-caption text-muted-foreground">{row.method}</span>}
      {row.voided !== null && (
        <span className="text-caption text-muted-foreground">{row.voided.line}</span>
      )}
    </span>
  );
}
