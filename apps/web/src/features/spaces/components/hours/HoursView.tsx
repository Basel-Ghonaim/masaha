import { Badge, cn } from '@shared/design-system';
import { Link } from 'react-router';
import type { HoursSectionView } from '../../hooks/hours/useHoursSection';

/** The week as a visitor reads it: a line per run of days with the same hours, today marked. */
export function HoursView({ view }: { view: HoursSectionView }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {view.rows.map((row) => (
          <div
            key={row.key}
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 px-3 py-2',
              row.today && 'bg-accent',
            )}
          >
            <dt className="flex items-center gap-2 text-body">
              {row.label}
              {row.today && <Badge variant="primary">{view.today}</Badge>}
            </dt>
            <dd className={cn('text-body', row.closed && 'text-muted-foreground')}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {view.closure && (
        <p className="text-body-sm text-muted-foreground">
          {view.closure.lead}{' '}
          <Link to={view.closure.href} className="text-primary underline underline-offset-4">
            {view.closure.label}
          </Link>
        </p>
      )}
    </div>
  );
}
