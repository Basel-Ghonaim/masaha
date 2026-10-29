import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

export type MeterProps = Omit<ComponentProps<'div'>, 'children' | 'role'> & {
  /** How much of the whole there is ("27"). */
  value: number;
  /** The whole ("40"). The bar starts at 0. */
  max: number;
  /** The bar's accessible name ("Seats taken"). */
  label: string;
  /**
   * `meter` for a share of a whole that is simply measured (occupancy); `progress` for a task on
   * its way to an end (an upload).
   */
  kind?: 'meter' | 'progress';
  /** `warning` when the share calls for attention (nearly full). */
  tone?: 'primary' | 'warning';
  /** The value as words, when the number alone does not say it ("27 of 40"). */
  valueText?: string;
};

/**
 * A bar showing a share of a whole: a muted track with a fill from the start side. The value is
 * kept inside 0…max, and the fill's width is set here, since no class outside the layer may draw it.
 */
export function Meter({
  value,
  max,
  label,
  kind = 'meter',
  tone = 'primary',
  valueText,
  className,
  ...props
}: MeterProps) {
  const bounded = Math.min(Math.max(value, 0), Math.max(max, 0));
  const share = max > 0 ? (bounded / max) * 100 : 0;

  return (
    <div
      data-slot="meter"
      role={kind === 'meter' ? 'meter' : 'progressbar'}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={bounded}
      aria-valuetext={valueText}
      className={cn('h-3 w-full overflow-hidden rounded-(--radius-pill) bg-muted', className)}
      {...props}
    >
      <div
        data-tone={tone}
        className={cn(
          'h-full rounded-(--radius-pill) transition-[inline-size]',
          tone === 'primary' ? 'bg-primary' : 'bg-warning',
        )}
        style={{ inlineSize: `${String(share)}%` }}
      />
    </div>
  );
}
