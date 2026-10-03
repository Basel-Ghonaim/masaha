import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** A layer icon, drawn in a muted circle. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The title's heading level, so it fits the page outline: `h1` when the state is the whole page. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
  /** Actions, such as clearing a search or adding the first item. */
  children?: ReactNode;
};

/**
 * What a list or page shows when it has nothing to show: an icon, a title, a line of text and the
 * actions that lead on. The actions stack at full width on a phone, and sit in a row from tablet up.
 */
export function EmptyState({
  icon,
  title,
  description,
  titleAs: Title = 'h2',
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}
      {...props}
    >
      {icon !== undefined && (
        <div
          aria-hidden
          className="mb-2 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-6"
        >
          {icon}
        </div>
      )}
      <Title className="text-heading-3">{title}</Title>
      {description !== undefined && (
        <p className="max-w-sm text-body-sm text-muted-foreground">{description}</p>
      )}
      {children !== undefined && (
        <div className="mt-4 flex w-full flex-col gap-2 md:w-auto md:flex-row md:justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
