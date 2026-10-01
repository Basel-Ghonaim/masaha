import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { LoaderIcon } from '../../../icons';
import { cn } from '../../../lib/cn';

// A filled variant's hover mixes its fill toward the foreground rather than fading it: fading
// primary to 90% leaves its label below AA in the light theme, while mixing toward the foreground
// raises the contrast with the label in both themes. The outline variant is edged like a card,
// so the edge stays visible in the dark theme, where the plain border is faint.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-(--radius-control) border border-transparent text-label whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_12%)]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]',
        outline:
          'border-(--card-border) bg-card text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground',
        ghost:
          'text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive),var(--foreground)_12%)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // A small button grows to the control height on touch screens, so it stays a 44px target.
      size: {
        sm: 'h-8 px-3 pointer-coarse:h-(--control-height)',
        md: 'h-(--control-height) px-(--button-padding-inline)',
        lg: 'h-12 px-6',
        icon: 'size-(--control-height)',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> &
  (
    | {
        /** Renders the single child (a router link, for example) with the button's styles. */
        asChild: true;
        loading?: never;
      }
    | {
        asChild?: false;
        /** A request is in flight: the button is disabled and busy, and keeps its label. */
        loading?: boolean;
      }
  );

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      className={classes}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderIcon aria-hidden className="motion-safe:animate-spin" />}
      {children}
    </button>
  );
}
