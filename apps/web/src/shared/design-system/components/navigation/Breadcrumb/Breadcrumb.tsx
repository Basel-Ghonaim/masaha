import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { ChevronEndIcon, EllipsisIcon } from '../../../icons';
import { cn } from '../../../lib/cn';

export type BreadcrumbProps = ComponentProps<'nav'> & {
  /** Names the trail for assistive technology, such as "Breadcrumb" in the page's language. */
  label: string;
};

/**
 * The path to a dashboard sub-page: each ancestor is a link, and the current page ends the trail.
 * The separators point along the reading direction.
 */
export function Breadcrumb({ label, ...props }: BreadcrumbProps) {
  return <nav data-slot="breadcrumb" aria-label={label} {...props} />;
}

export function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-body-sm break-words text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

export type BreadcrumbLinkProps = ComponentProps<'a'> & {
  /** Renders the single child (a router link, for example) with the link's styles. */
  asChild?: boolean;
};

export function BreadcrumbLink({ asChild = false, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot.Root : 'a';

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        'rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The current page: the end of the trail, and not a link. It keeps the trail's size and takes the
 * label weight, as in the Owner › Members stress test, so it stands out from the muted ancestors.
 */
export function BreadcrumbPage({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn('font-(weight:--type-label-weight) text-foreground', className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronEndIcon />}
    </li>
  );
}

export type BreadcrumbEllipsisProps = ComponentProps<'span'> & {
  /** Says that pages are left out of the trail, such as "More pages". */
  label: string;
};

/** Stands for the ancestors left out of a long trail. */
export function BreadcrumbEllipsis({ label, className, ...props }: BreadcrumbEllipsisProps) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn('flex size-5 items-center justify-center [&>svg]:size-4', className)}
      {...props}
    >
      <EllipsisIcon aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
