import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';

/** The strip's name: one of its own words or the element that names it, never neither or both. */
export type ScrollRegionName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never };

export type ScrollRegionProps = Omit<
  ComponentProps<'div'>,
  'role' | 'tabIndex' | 'ref' | 'aria-label' | 'aria-labelledby'
> &
  ScrollRegionName;

/**
 * Content that scrolls sideways, reached by the keyboard (foundation §10): a named group — not a
 * region, so a card that is already a region of the same name holds it without two landmarks of
 * one name — and a tab stop only while its content overflows, so the arrow keys can scroll it.
 * It measures its own box and its direct children's, again whenever one of them resizes, so its
 * content sizes itself (a row of photos as wide as its photos).
 */
export function ScrollRegion({ className, ...props }: ScrollRegionProps) {
  const own = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const element = own.current;
    if (!element) return;
    // The observer reports each box as it starts, then each time it changes.
    const observer = new ResizeObserver(() => {
      setOverflows(element.scrollWidth > element.clientWidth);
    });
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={own}
      data-slot="scroll-region"
      role="group"
      tabIndex={overflows ? 0 : undefined}
      className={cn(
        'overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
