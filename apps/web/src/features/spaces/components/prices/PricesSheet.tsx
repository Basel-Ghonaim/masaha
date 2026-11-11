import { Badge, Button, Field, Input, cn, useMediaQuery, XIcon } from '@shared/design-system';
import { usePricesSheet } from '../../hooks/prices/usePricesSheet';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { PriceSelect } from './PriceSelect';

/**
 * «الأسعار المعلنة»'s Sheet (R6–R9): from 768 px one line heads the columns and each row's fields
 * are named by the column and the row; below it each price is a small block, its fields named on it.
 */
export function PricesSheet({ host }: { host: SectionHost }) {
  const view = usePricesSheet(host);
  const wide = useMediaQuery('(min-width: 768px)');
  const { columns } = view;
  const grid = cn(
    'grid items-start gap-2',
    wide && (columns.shift ? 'grid-cols-12' : 'grid-cols-10'),
  );
  return (
    <EditSheet frame={view.frame}>
      <p className="text-body-sm text-muted-foreground">{view.hint}</p>
      {wide && view.rows.length > 0 && (
        <div aria-hidden className={cn(grid, 'text-caption text-muted-foreground')}>
          <span className="col-span-3">{columns.period}</span>
          <span className={columns.shift ? 'col-span-2' : 'col-span-3'}>{columns.audience}</span>
          {columns.shift && <span className="col-span-3">{columns.shift}</span>}
          <span className="col-span-3">{columns.amount}</span>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {view.rows.map((row) => (
          <li key={row.key} className={cn(grid, !wide && 'rounded-lg border border-border p-3')}>
            <div className="col-span-3">
              {row.label ? (
                <div className="flex flex-col gap-1.5">
                  <span className={wide ? 'sr-only' : 'text-label'}>{columns.period}</span>
                  <span className="flex flex-wrap items-center gap-2 text-body-sm">
                    <span lang={row.label.lang}>{row.label.text}</span>
                    <Badge variant="neutral">{row.label.period}</Badge>
                  </span>
                  {row.label.error && (
                    <p className="text-caption text-destructive">{row.label.error}</p>
                  )}
                </div>
              ) : (
                <PriceSelect
                  {...row.period}
                  name={wide ? row.cell(columns.period) : columns.period}
                  hidden={wide}
                />
              )}
            </div>
            <div className={columns.shift ? 'col-span-2' : 'col-span-3'}>
              <PriceSelect
                {...row.audience}
                name={wide ? row.cell(columns.audience) : columns.audience}
                hidden={wide}
              />
            </div>
            {row.shift && columns.shift && (
              <div className="col-span-3">
                <PriceSelect
                  {...row.shift}
                  name={wide ? row.cell(columns.shift) : columns.shift}
                  hidden={wide}
                />
              </div>
            )}
            <div className="col-span-3">
              <Field
                label={
                  wide ? (
                    <span className="sr-only">{row.cell(columns.amount)}</span>
                  ) : (
                    columns.amount
                  )
                }
                error={row.amount.error}
              >
                <Input inputMode="decimal" dir="ltr" autoComplete="off" {...row.amount.binding} />
              </Field>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={row.remove.label}
                disabled={row.remove.disabled}
                onClick={row.remove.run}
              >
                <XIcon aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {view.noneLeft && <p className="text-body-sm text-muted-foreground">{view.noneLeft}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={view.add.disabled} onClick={view.add.run}>
          {view.add.label}
        </Button>
        {view.add.reason && (
          <span className="text-caption text-muted-foreground">{view.add.reason}</span>
        )}
      </div>
      {view.addShift && (
        <p className="text-body-sm text-muted-foreground">
          {view.addShift.lead}{' '}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={view.addShift.run}
          >
            {view.addShift.label}
          </Button>
        </p>
      )}
    </EditSheet>
  );
}
