import type { PresentPerson } from '@masaha/shared/occupancy';
import { Badge } from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import { usePresentMatches } from '../hooks/present/usePresentMatches';

/**
 * «حاضر الآن», the desk's search's first group (K1): a section named by its `h2` (DI-38), then a row
 * each (DI-24) for the people present who answer `term` — their name and kind, since when and for
 * how long, a visit's charge so far — with the row's action the page sets (`action`), such as the
 * desk's check-out. Nothing when no one matches.
 */
export function PresentMatches({
  spaceId,
  term,
  phones,
  action,
}: {
  spaceId: number;
  term: string;
  /** The open check-ins' customers' phones, by customer id. */
  phones: ReadonlyMap<number, string>;
  action: (person: PresentPerson) => ReactNode;
}) {
  const matches = usePresentMatches(spaceId, term, phones);
  const headingId = useId();
  if (matches.rows.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-heading-3">
        {matches.heading}
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {matches.rows.map((row) => (
          <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label" dir="auto">
                  {row.name}
                </span>
                <Badge variant="neutral">{row.kind}</Badge>
              </div>
              <span className="text-caption text-muted-foreground">
                {row.since} · {row.duration}
                {row.detail !== null && <> · {row.detail}</>}
              </span>
            </div>
            {action(row.person)}
          </li>
        ))}
      </ul>
    </section>
  );
}
