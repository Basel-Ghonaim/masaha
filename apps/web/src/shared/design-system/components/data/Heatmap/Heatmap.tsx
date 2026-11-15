import { Fragment, type ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

/** One row of a heatmap: what it stands for ("Saturday") and one value per column. */
export type HeatmapRow = { label: string; values: number[] };

export type HeatmapProps = Omit<ComponentProps<'figure'>, 'children'> & {
  /** What the map shows; its caption, read by assistive technology only. */
  title: string;
  /** What the numbers count ("visits"), added to the hidden table's caption. */
  unit: string;
  /** The columns' headers ("8", "9" … for the hours). */
  columns: string[];
  rows: HeatmapRow[];
  /** The legend's two ends: the lightest step ("Fewer") and the darkest ("More"). */
  fewer: string;
  more: string;
  /** The hidden table's first header, naming what the rows are ("Day"). */
  dayLabel: string;
};

/** The five steps' tokens, lightest first: `primary` at a growing opacity over the `muted` cell. */
const STEPS = [
  'opacity-(--heatmap-step-1)',
  'opacity-(--heatmap-step-2)',
  'opacity-(--heatmap-step-3)',
  'opacity-(--heatmap-step-4)',
  'opacity-(--heatmap-step-5)',
] as const;

function stepOf(value: number, highest: number) {
  return STEPS[Math.min(STEPS.length - 1, Math.floor((value / highest) * STEPS.length))];
}

/**
 * A grid of rows by columns, each cell `primary` at one of five steps, with a legend from fewer to
 * more. The cells are drawn for the eye only; a visually hidden table holds every value.
 */
export function Heatmap({
  title,
  unit,
  columns,
  rows,
  fewer,
  more,
  dayLabel,
  className,
  ...props
}: HeatmapProps) {
  const highest = Math.max(1, ...rows.flatMap((row) => row.values));

  return (
    <figure
      data-slot="heatmap"
      className={cn('relative flex flex-col gap-3', className)}
      {...props}
    >
      <figcaption className="sr-only">{title}</figcaption>
      <div
        aria-hidden
        className="grid items-center gap-1"
        style={{ gridTemplateColumns: `auto repeat(${String(columns.length)}, minmax(0, 1fr))` }}
      >
        <span />
        {columns.map((column) => (
          <span key={column} className="text-center text-caption text-muted-foreground">
            {column}
          </span>
        ))}
        {rows.map((row) => (
          <Fragment key={row.label}>
            <span className="pe-2 text-caption whitespace-nowrap text-muted-foreground">
              {row.label}
            </span>
            {row.values.map((value, index) => (
              <span key={index} data-slot="heatmap-cell" className="block h-7 rounded-sm bg-muted">
                <span
                  className={cn('block size-full rounded-sm bg-primary', stepOf(value, highest))}
                />
              </span>
            ))}
          </Fragment>
        ))}
      </div>
      <div aria-hidden className="flex items-center gap-2 text-caption text-muted-foreground">
        {fewer}
        {STEPS.map((step) => (
          <span key={step} className={cn('size-3 shrink-0 rounded-sm bg-primary', step)} />
        ))}
        {more}
      </div>
      <div className="sr-only">
        <table>
          <caption>
            {title} ({unit})
          </caption>
          <thead>
            <tr>
              <th scope="col">{dayLabel}</th>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
