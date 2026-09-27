import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from '../../icons';
import { cn } from '../../lib/cn';

// Each status is its subtle surface with the text foundation §5 verifies on it; the icon and the
// description take that text colour too. The border is the status colour, which meets 3:1 against
// the page, so the alert keeps an edge in the dark theme, where the subtle surface barely differs
// from the page.
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-start text-body-sm has-data-[slot=alert-action]:pe-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        info: 'border-info bg-info-subtle text-info-subtle-foreground',
        warning: 'border-warning bg-warning-subtle text-warning-subtle-foreground',
        destructive: 'border-destructive bg-destructive-subtle text-destructive-subtle-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

type Variant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const ICONS: Record<Variant, typeof InfoIcon> = {
  info: InfoIcon,
  warning: TriangleAlertIcon,
  destructive: CircleAlertIcon,
};

export type AlertProps = ComponentProps<'div'> &
  VariantProps<typeof alertVariants> & {
    /** Replaces the variant's icon; `null` shows none. */
    icon?: ReactNode;
  };

/**
 * A notice inside the page: information, a warning, or an error. A destructive alert interrupts
 * assistive technology (`role="alert"`); the others are announced politely (`role="status"`). Pass
 * `role` to change it. Compose it from AlertTitle, AlertDescription and AlertAction.
 */
export function Alert({ className, variant, icon, children, ...props }: AlertProps) {
  const resolved = variant ?? 'info';
  const VariantIcon = ICONS[resolved];

  return (
    <div
      data-slot="alert"
      data-variant={resolved}
      role={resolved === 'destructive' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon === undefined ? <VariantIcon aria-hidden /> : icon}
      {children}
    </div>
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'text-label group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-body-sm text-balance group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  );
}

/** A control at the end of the alert, such as a link to fix the problem. */
export function AlertAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="alert-action" className={cn('absolute top-2.5 end-3', className)} {...props} />
  );
}
