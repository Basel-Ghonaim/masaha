import { Badge } from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import type { SectionMeta } from '../../types/SpacePageView';

/**
 * One section of a space's page, named by its heading: its `h2`, its meta under it (its date and
 * what else it says, then «قد يكون تغيّر» while stale), its own action at the heading's end when
 * it has one, and its body.
 */
export function Section({
  title,
  meta,
  action,
  children,
}: {
  title: string;
  meta: SectionMeta | null;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={id} className="text-heading-2">
            {title}
          </h2>
          {action}
        </div>
        {meta !== null && (meta.lines.length > 0 || meta.stale !== null) && (
          <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            {meta.lines.length > 0 && <p>{meta.lines.join(' · ')}</p>}
            {meta.stale !== null && <Badge variant="warning">{meta.stale}</Badge>}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
