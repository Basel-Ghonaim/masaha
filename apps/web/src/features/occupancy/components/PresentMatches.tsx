import type { PresentPerson } from '@masaha/shared/occupancy';
import { Badge } from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import { usePresentMatches } from '../hooks/present/usePresentMatches';
import type { PresentPeople } from '../types/PresentPeople';
import { PresentName } from './PresentName';

/**
 * «حاضر الآن», the desk's search's first group (K1): a section named by its `h2` (DI-38), then a row
 * each (DI-24) for the people present who answer `term` — their name and kind, since when and for
 * how long, a visit's charge so far — with the row's action the page sets (`action`), such as the
 * desk's check-out; a subscriber's plan names their badge and their name leads to their file
 * (`people`, the page's). Nothing when no one matches.
 */
export function PresentMatches({
  spaceId,
  term,
  phones,
  action,
  people,
}: {
  spaceId: number;
  term: string;
  /** The open check-ins' customers' phones, by customer id. */
  phones: ReadonlyMap<number, string>;
  action: (person: PresentPerson) => ReactNode;
  /** A subscriber's plan and the way to their file; with none, «اشتراك» and no link. */
  people?: PresentPeople;
}) {
  const matches = usePresentMatches(spaceId, term, phones, people?.plan);
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
                <PresentName row={row} fileLink={people?.fileLink} />
                <Badge variant={row.kind.variant}>{row.kind.label}</Badge>
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
