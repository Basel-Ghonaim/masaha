import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

// Each status is its subtle surface with the text foundation §5 verifies on it, never a tint of the
// status colour. A status badge always carries its word; the colour only repeats it.
const badgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-(--radius-pill) px-2 text-caption whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-secondary text-secondary-foreground',
        primary: 'bg-accent text-accent-foreground',
        success: 'bg-success-subtle text-success-subtle-foreground',
        warning: 'bg-warning-subtle text-warning-subtle-foreground',
        info: 'bg-info-subtle text-info-subtle-foreground',
        destructive: 'bg-destructive-subtle text-destructive-subtle-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

/** A short label for a state or a category, such as a membership's status. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? 'neutral'}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
