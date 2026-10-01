import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

// A dark card has no shadow (foundation §5), so its --card-border carries the edge in that theme.

/** A raised surface for one piece of content. Compose it from the parts below. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-(--card-padding) overflow-hidden rounded-lg border border-(--card-border) bg-card py-(--card-padding) text-body text-card-foreground shadow-raised has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg',
        className,
      )}
      {...props}
    />
  );
}

/** The title and description, with an optional CardAction at the end of the row. */
export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min items-start gap-1 px-(--card-padding) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-padding)',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('text-heading-3', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-body-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/** A control at the end of the header row, beside the title and description. */
export function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('flex flex-col gap-3 px-(--card-padding)', className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-3 px-(--card-padding) [.border-t]:pt-(--card-padding)',
        className,
      )}
      {...props}
    />
  );
}
