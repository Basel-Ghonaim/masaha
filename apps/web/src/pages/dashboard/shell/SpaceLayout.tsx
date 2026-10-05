import { SpaceSwitcher } from '@features/space-links';
import { useCopy } from '@shared/copy';
import { spaceHomePath } from '@shared/routing';
import { DashboardLayout } from './DashboardLayout';
import { DashboardNavigation } from './DashboardNavigation';
import { PublicPageLink } from './PublicPageLink';
import { useSpaceShell } from './useSpaceShell';

/**
 * The shell of the space in the URL (`:spaceId`, ADR 0016): the switcher, the pages the user's role
 * at that space allows, and the space's public page. Entering a space the user holds a link to
 * remembers it for the landing. A space they hold none at gets no pages; its routes' guards show
 * the 404 or the 403 inside this shell. Each space has a shell of its own, so moving to another
 * space, from the switcher or the history, closes the phone's drawer.
 */
export function SpaceLayout() {
  const copy = useCopy();
  const { spaceId, slug, navigation } = useSpaceShell();

  return (
    <DashboardLayout
      key={spaceId}
      label={copy.dashboard.spaceNavigation}
      header={
        <div className="shrink-0 p-2">
          <SpaceSwitcher spaceId={spaceId} spaceLink={spaceHomePath} />
        </div>
      }
      footer={slug !== undefined && <PublicPageLink slug={slug} />}
    >
      {navigation && <DashboardNavigation base={navigation.base} items={navigation.items} />}
    </DashboardLayout>
  );
}
