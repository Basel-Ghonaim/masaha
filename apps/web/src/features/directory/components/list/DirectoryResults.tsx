import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { DirectoryListView } from '../../types/DirectoryListView';
import type { DirectorySlots } from '../../types/DirectorySlots';
import { SpaceCard } from '../card/SpaceCard';
import { FailureAlert } from './FailureAlert';
import { ResultsState } from './ResultsState';

/**
 * The results: a section named by its heading, which assistive technology reads and the eye does
 * not, marked busy while a fetch runs over the cards shown. When the page changes, never on the
 * first render, the focus moves to that heading and the section's start scrolls into view.
 */
export function DirectoryResults({
  results,
  page,
  slots,
  pagination,
}: {
  results: DirectoryListView['results'];
  page: number;
  slots: DirectorySlots;
  pagination: ReactNode;
}) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);
  // The page the focus was last placed for; the first render's, so it is left where it is.
  const placed = useRef(page);

  useEffect(() => {
    if (placed.current === page) return;
    placed.current = page;
    heading.current?.focus({ preventScroll: true });
    section.current?.scrollIntoView({ block: 'start' });
  }, [page]);

  return (
    <section
      ref={section}
      aria-labelledby={headingId}
      aria-busy={results.busy}
      className="flex flex-col gap-4"
    >
      <h2 ref={heading} id={headingId} tabIndex={-1} className="sr-only">
        {results.heading}
      </h2>
      {results.refreshFailure !== null && <FailureAlert failure={results.refreshFailure} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResultsState results={results} />
        {results.state === 'ready' &&
          results.cards.map((card) => (
            <SpaceCard
              key={card.key}
              card={card}
              href={slots.spaceLink(card.slug)}
              areaName={slots.areaName(card.areaId)}
            />
          ))}
      </div>
      {pagination}
    </section>
  );
}
