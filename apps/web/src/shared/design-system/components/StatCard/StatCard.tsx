import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Card } from '../Card';

export type StatCardProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** What the number counts ("Present now"). */
  label: ReactNode;
  /**
   * The number itself. A value whose parts must keep their order in RTL, such as "7 / 40", is
   * passed already isolated, for example in an element with `dir="ltr"`.
   */
  value: ReactNode;
  /** A line of context under the value ("of 40 seats"). */
  helper?: ReactNode;
  /** A layer icon, at the end of the label row. */
  icon?: ReactNode;
};

/**
 * One number on a dashboard overview, with its label. The label and value are a term and its
 * definition, so assistive technology reads them as a pair.
 */
export function StatCard({ label, value, helper, icon, className, ...props }: StatCardProps) {
  return (
    <Card
      data-slot="stat-card"
      className={cn('flex-row items-start gap-3 px-(--card-padding)', className)}
      {...props}
    >
      <dl className="flex flex-1 flex-col gap-1">
        <dt className="text-label text-muted-foreground">{label}</dt>
        <dd className="text-heading-1">{value}</dd>
        {helper !== undefined && <dd className="text-caption text-muted-foreground">{helper}</dd>}
      </dl>
      {icon !== undefined && (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground [&_svg:not([class*='size-'])]:size-5"
        >
          {icon}
        </span>
      )}
    </Card>
  );
}
