import { HomeSpaces } from '@features/directory';
import { AreaName } from '@features/lookups';
import { useCopy } from '@shared/copy';
import { publicSpacePath } from '@shared/routing';
import { useRef } from 'react';
import { SITE_PATHS } from '../../navigation';
import { AreaCards } from './AreaCards';
import { HomeSearch } from './HomeSearch';
import { OwnersCard } from './OwnersCard';

// The lookups' area name set in the spaces' slot, made once so it is the same between renders.
const areaName = (areaId: number) => <AreaName areaId={areaId} source="public" />;

/** The Directory's addresses Home's spaces lead to: all of it, its spaces available now, its map. */
const LINKS = {
  list: SITE_PATHS.spaces,
  available: `${SITE_PATHS.spaces}?available=1`,
  map: `${SITE_PATHS.spaces}?view=map`,
} as const;

/**
 * The home page (screen 1): the hero with its search; the spaces available now, or the nearest;
 * «تصفّح حسب المنطقة», which near me's «اختر منطقتك» scrolls to and focuses; and the owners' card.
 */
export function HomePage() {
  const words = useCopy().site.home;
  const areasHeading = useRef<HTMLHeadingElement>(null);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-heading-1 md:text-display">{words.title}</h1>
        <p className="max-w-2xl text-body text-muted-foreground">{words.lead}</p>
        <HomeSearch />
      </div>
      <HomeSpaces
        spaceLink={publicSpacePath}
        areaName={areaName}
        links={LINKS}
        chooseArea={() => {
          areasHeading.current?.scrollIntoView({ block: 'start' });
          areasHeading.current?.focus({ preventScroll: true });
        }}
      />
      <AreaCards headingRef={areasHeading} />
      <OwnersCard />
    </div>
  );
}
