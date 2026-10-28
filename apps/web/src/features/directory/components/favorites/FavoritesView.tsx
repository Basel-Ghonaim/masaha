import { Button, EmptyState, HeartIcon } from '@shared/design-system';
import type { SpaceNameView } from '@shared/lib';
import { useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useFavoritesView } from '../../hooks/favorites/useFavoritesView';
import { useUnlistedFocus } from '../../hooks/favorites/useUnlistedFocus';
import type { DirectorySlots } from '../../types/DirectorySlots';
import { SpaceCard } from '../card/SpaceCard';
import { SpaceCardSkeleton } from '../card/SpaceCardSkeleton';
import { FailureAlert } from '../list/FailureAlert';
import { LocationStatus } from '../near/LocationStatus';
import { NearMeButton } from '../near/NearMeButton';
import { UnlistedFavorite } from './UnlistedFavorite';

const SKELETONS = [1, 2, 3];

/**
 * «المفضّلة» (screen 10): a section named by its heading, marked busy while the order changes; the
 * count with «الأقرب إليّ» in a row and near me's state line; the listed spaces as the directory's
 * cards, each with the page's action (the heart); then the spaces that left, each a muted card with
 * its name and the page's action («إزالة»); their skeletons while they load, the failure with its
 * retry, or, with none, the empty state and «تصفّح المساحات». A row removed while its action holds
 * the focus hands it to the next row's, else the first card's heart, else the count (DI-52).
 */
export function FavoritesView({
  spaceLink,
  areaName,
  cardAction,
  unlistedAction,
  browseLink,
  chooseArea,
  openMap,
}: {
  spaceLink: DirectorySlots['spaceLink'];
  areaName: DirectorySlots['areaName'];
  /** The heart on each listed space's card. */
  cardAction: NonNullable<DirectorySlots['cardAction']>;
  /** «إزالة» on each space that left. */
  unlistedAction: (space: { id: number; name: SpaceNameView }) => ReactNode;
  browseLink: string;
  chooseArea: () => void;
  openMap: () => void;
}) {
  const headingId = useId();
  const nearButton = useRef<HTMLButtonElement>(null);
  const view = useFavoritesView({ chooseArea, openMap });
  const { viewRef, countRef } = useUnlistedFocus(view.unlisted.map((space) => space.key));

  return (
    <section
      ref={viewRef}
      aria-labelledby={headingId}
      aria-busy={view.busy || undefined}
      className="flex flex-col gap-4"
    >
      <h2 id={headingId} className="sr-only">
        {view.region}
      </h2>
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            ref={countRef}
            tabIndex={-1}
            aria-live="polite"
            className="text-body-sm text-muted-foreground outline-none"
          >
            {view.count}
          </p>
          <NearMeButton ref={nearButton} button={view.near.button} />
        </div>
        <LocationStatus
          view={view.near.status}
          returnFocus={() => {
            nearButton.current?.focus();
          }}
        />
      </div>
      {view.state === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SKELETONS.map((key) => (
            <SpaceCardSkeleton key={key} />
          ))}
        </div>
      )}
      {view.state === 'failed' && view.failure !== null && <FailureAlert failure={view.failure} />}
      {view.state === 'empty' && (
        <EmptyState
          titleAs="h3"
          icon={<HeartIcon />}
          title={view.empty.title}
          description={view.empty.text}
        >
          <Button asChild variant="outline">
            <Link to={browseLink}>{view.empty.browse}</Link>
          </Button>
        </EmptyState>
      )}
      {view.state === 'ready' && view.cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {view.cards.map((card) => (
            <SpaceCard
              key={card.key}
              card={card}
              href={spaceLink(card.slug)}
              areaName={areaName(card.areaId)}
              action={cardAction({ id: card.key, name: card.name, saved: true })}
            />
          ))}
        </div>
      )}
      {view.state === 'ready' && view.unlisted.length > 0 && (
        <ul className="flex flex-col gap-4">
          {view.unlisted.map((space) => (
            <li key={space.key} data-unlisted-key={space.key}>
              <UnlistedFavorite
                space={space}
                action={unlistedAction({ id: space.id, name: space.name })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
