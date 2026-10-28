import { Button, EmptyState } from '@shared/design-system';
import { useId, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useFavoriteIds } from '../../hooks/favorites/useFavoriteIds';
import { useHomeSpaces } from '../../hooks/home/useHomeSpaces';
import type { DirectorySlots } from '../../types/DirectorySlots';
import { SpaceCard } from '../card/SpaceCard';
import { SpaceCardSkeleton } from '../card/SpaceCardSkeleton';
import { FailureAlert } from '../list/FailureAlert';
import { LocationStatus } from '../near/LocationStatus';
import { NearMeButton } from '../near/NearMeButton';

const SKELETONS = [1, 2, 3, 4, 5, 6];

/**
 * Home's spaces: a section named by its heading, «متاحة الآن» or «المساحات الأقرب إليك», with
 * «الأقرب إليّ» and «عرض الكل» at the row's end and near me's state line under it; then six cards
 * at most, their skeletons while they load, the failure with its retry, or, with none, the empty
 * state and «تصفّح كل المساحات». The page sets the links to the spaces, the areas' names, the
 * Directory's addresses, what «اختر منطقتك» does, and an action on each card (the heart).
 */
export function HomeSpaces({
  spaceLink,
  areaName,
  links,
  chooseArea,
  cardAction,
}: {
  spaceLink: (slug: string) => string;
  areaName: (areaId: number) => ReactNode;
  /** The Directory's list, its spaces available now, and its map. */
  links: { list: string; available: string; map: string };
  chooseArea: () => void;
  cardAction?: DirectorySlots['cardAction'];
}) {
  const headingId = useId();
  const nearButton = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const saved = useFavoriteIds();
  const home = useHomeSpaces({
    chooseArea,
    openMap: () => {
      void navigate(links.map);
    },
  });

  return (
    <section aria-labelledby={headingId} aria-busy={home.busy} className="flex flex-col gap-4">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={headingId} className="text-heading-2">
            {home.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <NearMeButton ref={nearButton} button={home.near.button} />
            <Button asChild variant="link" size="sm">
              <Link to={home.viewAll.to === 'list' ? links.list : links.available}>
                {home.viewAll.label}
              </Link>
            </Button>
          </div>
        </div>
        <LocationStatus
          view={home.near.status}
          returnFocus={() => {
            nearButton.current?.focus();
          }}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {home.state === 'loading' && SKELETONS.map((key) => <SpaceCardSkeleton key={key} />)}
        {home.state === 'failed' && home.failure !== null && (
          <div className="col-span-full">
            <FailureAlert failure={home.failure} />
          </div>
        )}
        {home.state === 'empty' && (
          <EmptyState
            className="col-span-full"
            titleAs="h3"
            title={home.empty.title}
            description={home.empty.text}
          >
            <Button asChild variant="outline">
              <Link to={links.list}>{home.empty.action}</Link>
            </Button>
          </EmptyState>
        )}
        {home.state === 'ready' &&
          home.cards.map((card) => (
            <SpaceCard
              key={card.key}
              card={card}
              href={spaceLink(card.slug)}
              areaName={areaName(card.areaId)}
              action={cardAction?.({
                id: card.key,
                name: card.name,
                saved: saved?.has(card.key) ?? false,
              })}
            />
          ))}
      </div>
    </section>
  );
}
