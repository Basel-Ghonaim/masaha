import { useEffect, useId, useRef, type ReactNode } from 'react';
import { NavigationType, useNavigationType } from 'react-router';
import type { DirectoryListView } from '../../types/DirectoryListView';
import { useFavoriteIds } from '../../hooks/favorites/useFavoriteIds';
import type { DirectorySlots } from '../../types/DirectorySlots';
import { SpaceCard } from '../card/SpaceCard';
import { FailureAlert } from './FailureAlert';
import { ResultsState } from './ResultsState';

/**
 * The results: a section named by its heading, which assistive technology reads and the eye does
 * not, marked busy while a fetch runs over the cards shown. When the visitor chooses another page
 * (the pages are links, pushed), the focus moves to that heading and the section's start scrolls
 * into view; never on the first render, nor when a search, an order or a page past the last
 * replaces the address and so changes the page shown. Each card carries the page's action, told
 * whether the user saved the space.
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
  const arrival = useNavigationType();
  // The page shown last; the first render's, so the focus is left where it is.
  const shown = useRef(page);
  const saved = useFavoriteIds();

  useEffect(() => {
    if (shown.current === page) return;
    shown.current = page;
    if (arrival !== NavigationType.Push) return;
    heading.current?.focus({ preventScroll: true });
    section.current?.scrollIntoView({ block: 'start' });
  }, [page, arrival]);

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
              action={slots.cardAction?.({
                id: card.key,
                name: card.name,
                saved: saved?.has(card.key) ?? false,
              })}
            />
          ))}
      </div>
      {pagination}
    </section>
  );
}
