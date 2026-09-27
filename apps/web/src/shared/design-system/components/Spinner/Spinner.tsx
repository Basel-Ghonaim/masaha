import type { ComponentProps } from 'react';
import { LoaderIcon } from '../../icons';
import { cn } from '../../lib/cn';

export type SpinnerProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** What is loading, announced to assistive technology ("Loading members"). */
  label: string;
};

/** Shows that something is loading. It turns only when motion is allowed. */
export function Spinner({ label, className, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <LoaderIcon aria-hidden className="motion-safe:animate-spin" />
    </span>
  );
}
