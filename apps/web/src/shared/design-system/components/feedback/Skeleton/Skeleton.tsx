import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

/**
 * A placeholder in the shape of content that is loading. It is hidden from assistive technology:
 * the region that loads says so itself (with `aria-busy`, for example). It pulses only when motion
 * is allowed.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('rounded-md bg-muted motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}
