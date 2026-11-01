import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

/** One series of a bar chart: its name, and which of the `chart-*` roles draws it. */
export type BarChartSeries = { name: string; tone: 1 | 2 | 3 | 4 | 5 };

/** One bar: what it stands for, an optional shorter tick under it, and one value per series. */
export type BarChartDatum = { label: string; tick?: string; values: number[] };

export type BarChartProps = Omit<ComponentProps<'figure'>, 'children'> & {
  /** What the chart shows; its caption, read by assistive technology only. */
  title: string;
  /** The series, stacked from the bottom in this order. A legend names them when there are two or more. */
  series: BarChartSeries[];
  data: BarChartDatum[];
  /** How a value is written in the hidden table ("45 ₪"). */
  format: (value: number) => string;
  /** `md` 200px high; `sm` 120px, for a chart beside others. */
  size?: 'md' | 'sm';
  /** The hidden table's first header, naming what the rows are ("Month"). */
  periodLabel: string;
};

const TONES = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
} as const;

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Stacked vertical bars, hand-built on the `chart-*` roles. The bars are drawn for the eye only;
 * a visually hidden table holds every value of every series, so assistive technology reads the
 * numbers rather than the shapes.
 */
export function BarChart({
  title,
  series,
  data,
  format,
  size = 'md',
  periodLabel,
  className,
  ...props
}: BarChartProps) {
  const highest = Math.max(1, ...data.map((datum) => sum(datum.values)));

  return (
    <figure data-slot="bar-chart" className={cn('flex flex-col gap-3', className)} {...props}>
      <figcaption className="sr-only">{title}</figcaption>
      {series.length > 1 && (
        <ul data-slot="bar-chart-legend" aria-hidden className="flex flex-wrap gap-4">
          {series.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-2 text-caption text-muted-foreground"
            >
              <span className={cn('size-3 shrink-0 rounded-sm', TONES[item.tone])} />
              {item.name}
            </li>
          ))}
        </ul>
      )}
      <div
        aria-hidden
        className={cn(
          'flex items-end gap-1 border-b border-border',
          size === 'md' ? 'h-(--chart-height-md)' : 'h-(--chart-height-sm)',
        )}
      >
        {data.map((datum, index) => {
          const total = sum(datum.values);
          return (
            <div key={index} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm"
                style={{ blockSize: `${String((total / highest) * 100)}%` }}
              >
                {datum.values.map((value, position) => (
                  <div
                    key={position}
                    className={TONES[series[position]?.tone ?? 1]}
                    style={{ blockSize: total > 0 ? `${String((value / total) * 100)}%` : 0 }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div data-slot="bar-chart-ticks" aria-hidden className="flex gap-1">
        {data.map((datum, index) => (
          <span
            key={index}
            className="min-w-0 flex-1 text-center text-caption whitespace-nowrap text-muted-foreground"
          >
            {datum.tick ?? datum.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{periodLabel}</th>
            {series.map((item) => (
              <th key={item.name} scope="col">
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((datum, index) => (
            <tr key={index}>
              <th scope="row">{datum.label}</th>
              {series.map((item, position) => (
                <td key={item.name}>{format(datum.values[position] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
