import { Slot } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronEndIcon, ChevronStartIcon, EllipsisIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { Button } from '../Button';

export type PaginationProps = ComponentProps<'nav'> & {
  /** Names the navigation for assistive technology, such as "Pages of the members list". */
  label: string;
};

/**
 * Moves between the pages of a list. From the tablet up it shows the page numbers, as in the
 * Owner › Members stress test; on a phone, Previous and Next around a summary such as "Page 1 of 5".
 * Every word arrives as a prop.
 */
export function Pagination({ label, className, ...props }: PaginationProps) {
  return (
    <nav
      data-slot="pagination"
      aria-label={label}
      className={cn('flex w-full md:w-auto', className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn(
        // Page numbers leave the row on a phone, where the summary stands in for them.
        'flex w-full items-center justify-between gap-1 md:w-auto md:justify-start max-md:[&>li:has([data-slot=pagination-link],[data-slot=pagination-ellipsis])]:hidden',
        className,
      )}
      {...props}
    />
  );
}

export function PaginationItem(props: ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type LinkProps = ComponentProps<'a'> & {
  /** Renders the single child (a router link, for example) with the link's styles. */
  asChild?: boolean;
};

// A link with no page to go to (Previous on the first page) is marked disabled rather than removed,
// so the row keeps its shape; it has no href, so it cannot be followed or focused.
const unavailableClasses = 'aria-disabled:pointer-events-none aria-disabled:opacity-50';

export type PaginationLinkProps = LinkProps & {
  /** The page being shown. */
  isActive?: boolean;
};

/** A page number. The current page is outlined on the page background and marked as current. */
export function PaginationLink({
  isActive = false,
  asChild = false,
  className,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : 'a';

  return (
    <Button
      asChild
      variant={isActive ? 'outline' : 'ghost'}
      className={cn(
        'size-8 px-0 pointer-coarse:size-(--control-height)',
        // The current page keeps its outline on the page background, as in the stress test, rather
        // than the outline variant's card fill.
        isActive && 'bg-background',
        className,
      )}
    >
      <Comp data-slot="pagination-link" aria-current={isActive ? 'page' : undefined} {...props} />
    </Button>
  );
}

type StepProps = LinkProps & {
  /** The visible word, such as "Previous" or "Next"; with `asChild`, the link that holds it. */
  children: ReactNode;
  /** There is no page in this direction. */
  disabled?: boolean;
};

function PaginationStep({
  children,
  disabled = false,
  asChild = false,
  href,
  side,
  className,
  ...props
}: StepProps & { side: 'previous' | 'next' }) {
  const Comp = asChild ? Slot.Root : 'a';

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      // Outlined buttons on a phone, where they are the only controls in the row.
      className={cn(
        'gap-1 px-2 max-md:h-(--control-height) max-md:border-(--card-border) max-md:bg-card max-md:px-3',
        unavailableClasses,
        className,
      )}
    >
      <Comp
        data-slot={`pagination-${side}`}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        role={disabled ? 'link' : undefined}
        {...props}
      >
        {side === 'previous' && <ChevronStartIcon aria-hidden />}
        <Slot.Slottable>{children}</Slot.Slottable>
        {side === 'next' && <ChevronEndIcon aria-hidden />}
      </Comp>
    </Button>
  );
}

export type PaginationPreviousProps = StepProps;

/** Goes to the previous page; its chevron points to the start side. */
export function PaginationPrevious(props: PaginationPreviousProps) {
  return <PaginationStep side="previous" {...props} />;
}

export type PaginationNextProps = StepProps;

/** Goes to the next page; its chevron points to the end side. */
export function PaginationNext(props: PaginationNextProps) {
  return <PaginationStep side="next" {...props} />;
}

export type PaginationEllipsisProps = ComponentProps<'span'> & {
  /** Says that page numbers are left out, such as "More pages". */
  label: string;
};

export function PaginationEllipsis({ label, className, ...props }: PaginationEllipsisProps) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn('flex size-8 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <EllipsisIcon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Where the list is, such as "Page 1 of 5": shown on a phone, in place of the page numbers. */
export function PaginationSummary({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot="pagination-summary"
      className={cn('text-center text-body-sm text-muted-foreground md:hidden', className)}
      {...props}
    />
  );
}
