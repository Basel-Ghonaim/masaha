import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { LoaderIcon } from '../../../icons';
import { cn } from '../../../lib/cn';

// `main` is the screen's one main action (ADR 0022), the berry in light and the ink's button in
// dark; a caller asks for it, and the default stays the ink (`primary`), so a screen gains a main
// action only where it is chosen. A hover never fades a fill: fading primary to 90% would leave its
// label below AA. The main action's and the ink's hovers are roles of their own
// (`main-action-hover`, `primary-hover`); secondary and destructive mix their fill toward the
// foreground, which raises the contrast with the label in both themes. Outline and ghost hover, and
// mark their open menu, with the neutral `hover` fill, never the selected tint. A ghost inside a
// table row, which already takes `hover` under the pointer and while its menu is open, takes the
// ink's wash (`hover-on-muted`) instead: its rule names the row, so it outweighs the plain hover by
// specificity, never by the order Tailwind emits them in. The outline variant is edged like a card,
// so the edge stays visible in the dark theme, where the plain border is faint. The link variant is
// underlined at rest, as a link in running text is: in ink, it would read as text. A button marked
// `aria-disabled`, which waits but keeps its place in the focus order, looks disabled too.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-(--radius-control) border border-transparent text-label whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        main: 'bg-main-action text-main-action-foreground hover:bg-main-action-hover',
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_8%)]',
        outline:
          'border-(--card-border) bg-card text-foreground hover:bg-hover hover:text-hover-foreground aria-expanded:bg-hover aria-expanded:text-hover-foreground',
        ghost:
          'text-foreground hover:bg-hover hover:text-hover-foreground aria-expanded:bg-hover aria-expanded:text-hover-foreground [[data-slot=table-row]_&]:hover:bg-hover-on-muted [[data-slot=table-row]_&]:aria-expanded:bg-hover-on-muted',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive),var(--foreground)_12%)]',
        link: 'text-primary underline underline-offset-4',
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
