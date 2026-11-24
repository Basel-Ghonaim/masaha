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
  ScrollRegionName & {
    /** While the content fits: no role, no name. For content that already carries the name. */
    quietWhileFits?: boolean;
  };

/**
 * Content that scrolls sideways, reached by the keyboard (foundation §10): a named group — not a
 * region, so a card that is already a region of the same name holds it without two landmarks of
 * one name — and a tab stop only while its content overflows, so the arrow keys can scroll it.
 * With `quietWhileFits` it is a plain box until then, so content with its own name is not named
 * twice. It measures its own box and its direct children's, again whenever one of them resizes,
 * so its content sizes itself (a row of photos as wide as its photos).
 */
export function ScrollRegion({
  className,
  quietWhileFits = false,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  ...props
}: ScrollRegionProps) {
  const own = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const exposed = overflows || !quietWhileFits;

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
      role={exposed ? 'group' : undefined}
      aria-label={exposed ? label : undefined}
      aria-labelledby={exposed ? labelledBy : undefined}
      tabIndex={overflows ? 0 : undefined}
      className={cn(
        'overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
