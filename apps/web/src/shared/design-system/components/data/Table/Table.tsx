import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';
import { ScrollRegion, type ScrollRegionName } from '../../display/ScrollRegion';

export type TableProps = Omit<ComponentProps<'table'>, 'aria-label' | 'aria-labelledby'> &
  ScrollRegionName;

/**
 * A table of records, as in the Owner › Members stress test: a muted header row, dense rows with a
 * divider, and a row that takes the hover fill while hovered or while its row menu is open. It
 * scrolls sideways when it is wider than its place, in a ScrollRegion, so the keyboard reaches it
 * while it overflows (foundation §10). The caller writes its one name once, a label or the
 * element that names it: it names the table, and the region too only while the table overflows,
 * since a focused element needs a name. It has no frame of its own: DataTable frames it as a card
 * with its toolbar and pagination, and a table on its own sits in a Card. Both frames clip what
 * overflows them, so the region's focus ring is drawn inside it.
 */
export function Table({
  className,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  ...props
}: TableProps) {
  const name = (
    labelledBy === undefined ? { 'aria-label': label } : { 'aria-labelledby': labelledBy }
  ) as ScrollRegionName;
  return (
    <ScrollRegion
      data-slot="table-container"
      className="relative w-full focus-visible:-outline-offset-2"
      quietWhileFits
      {...name}
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-body-sm', className)}
        {...name}
        {...props}
      />
    </ScrollRegion>
  );
}

/** The header rows, on `muted`; they keep it under the pointer. */
export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-muted [&_tr]:hover:bg-muted', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t border-border bg-muted text-label [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

/**
 * One row. It takes the neutral `hover` fill under the pointer, and while a menu opened from it is
 * open, so the row an action applies to stays marked (the Data reports stress test); never the
 * selected tint. Text on it keeps its colour: `muted-foreground` is verified on it, and
 * `foreground` is its `-foreground`'s value (foundation §5).
 */
export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors hover:bg-hover has-data-open:bg-hover',
        className,
      )}
      {...props}
    />
  );
}

// The outer cells line up with the card padding of the frame around the table.
const EDGE_PADDING = 'px-3 first:ps-5 last:pe-5';

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-8 text-start align-middle text-caption whitespace-nowrap text-muted-foreground',
        EDGE_PADDING,
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('py-(--table-row-padding-block) align-middle', EDGE_PADDING, className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-body-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
