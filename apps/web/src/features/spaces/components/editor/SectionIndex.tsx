import { Button, cn, useMediaQuery } from '@shared/design-system';
import { Link } from 'react-router';
import type { SectionState } from '../../services/completeness';
import type { SectionId } from '../../types/SectionId';

type IndexItem = {
  id: SectionId;
  label: string;
  /** Null while the gallery is read: no dot is guessed. */
  state: SectionState | null;
  stateLabel: string | null;
  current: boolean;
  choose: () => void;
};

/** Each state's dot: complete, stale, missing, or optional (the shifts, with none). */
const DOTS: Record<SectionState, string> = {
  ok: 'bg-success',
  stale: 'bg-warning',
  missing: 'bg-destructive',
  optional: 'bg-border',
};

/**
 * The profile's sections, from 1024 px only (G3; a phone has no index): each a link to its anchor,
 * with its state's dot and the state said to a screen reader, the section in view marked. A link is
 * the router's, so the scroll lands and stays, and the leave guard lets it through.
 */
export function SectionIndex({ label, items }: { label: string; items: IndexItem[] }) {
  const wide = useMediaQuery('(min-width: 1024px)');
  if (!wide) return null;
  return (
    <nav aria-label={label} className="sticky top-20 col-span-3 flex flex-col gap-1">
      {items.map((item) => (
        <Button
          key={item.id}
          asChild
          size="sm"
          // The section in view is selected: the spark's tint, with no ghost hover (foundation §5).
          variant={item.current ? null : 'ghost'}
          className={cn(
            'w-full justify-between',
            item.current && 'bg-accent text-accent-foreground',
          )}
        >
          <Link
            to={{ hash: item.id }}
            aria-current={item.current ? 'location' : undefined}
            onClick={item.choose}
          >
            <span>{item.label}</span>
            {item.state !== null && (
              <span className="flex items-center gap-2">
                <span className="sr-only">{item.stateLabel}</span>
                <span
                  aria-hidden
                  className={cn('size-2.5 shrink-0 rounded-full', DOTS[item.state])}
                />
              </span>
            )}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
