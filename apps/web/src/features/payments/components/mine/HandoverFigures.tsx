import { Card, CardContent, StatCard, useMediaQuery } from '@shared/design-system';
import type { MyPaymentsTodayView } from '../../hooks/mine/useMyPaymentsToday';

type Figures = NonNullable<MyPaymentsTodayView['figures']>;

/**
 * The handover's figures, the cash to hand over first (K4): below 768 px one card of three rows —
 * the cash, the transfer with «وصلت إلى حساب المساحة» under it (DI-10), the total with how many —;
 * from 768 px three stat cards, the transfer's and the total's lines as their helpers.
 */
export function HandoverFigures({ figures }: { figures: Figures }) {
  const wide = useMediaQuery('(min-width: 768px)');
  const { cash, transfer, total } = figures;

  if (wide) {
    return (
      <section aria-label={figures.label} className="grid gap-4 md:grid-cols-3">
        <StatCard label={cash.label} value={cash.amount} />
        <StatCard label={transfer.label} value={transfer.amount} helper={transfer.helper} />
        <StatCard label={total.label} value={total.amount} helper={total.count} />
      </section>
    );
  }
  return (
    <Card aria-label={figures.label} role="region">
      <CardContent>
        <dl className="flex flex-col divide-y divide-border">
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-label">{cash.label}</dt>
            <dd className="text-heading-3">{cash.amount}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="flex flex-col">
              <span className="text-label">{transfer.label}</span>
              <span className="text-caption text-muted-foreground">{transfer.helper}</span>
            </dt>
            <dd className="text-heading-3">{transfer.amount}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="flex flex-col">
              <span className="text-label">{total.label}</span>
              <span className="text-caption text-muted-foreground">{total.count}</span>
            </dt>
            <dd className="text-heading-3">{total.amount}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
