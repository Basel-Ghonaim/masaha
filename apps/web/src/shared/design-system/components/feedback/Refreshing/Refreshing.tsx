import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

export type RefreshingProps = ComponentProps<'div'> & {
  /** What it holds is being replaced: another page or filter is loading over it. */
  refreshing: boolean;
};

/**
 * Holds a list that is not a table, such as a grid of cards, while its next page or filter loads:
 * the cards shown stay, dimmed, and the list is marked busy, so the list never blanks between two
 * answers (DataTable's `refreshing` does the same for its rows).
 */
export function Refreshing({ refreshing, className, ...props }: RefreshingProps) {
  return (
    <div
      data-slot="refreshing"
      data-refreshing={refreshing ? '' : undefined}
      aria-busy={refreshing || undefined}
      className={cn('transition-opacity data-refreshing:opacity-(--refreshing)', className)}
      {...props}
    />
  );
}
