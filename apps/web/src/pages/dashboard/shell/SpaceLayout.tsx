import { SpaceSwitcher, useMySpacesQuery } from '@features/space-links';
import { useCopy } from '@shared/copy';
import { EyeIcon, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@shared/design-system';
import {
  parseSpaceId,
  publicSpacePath,
  rememberSpace,
  spaceHomePath,
  spaceOverviewPath,
} from '@shared/routing';
import { useSession } from '@shared/session';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { SPACE_NAV } from '../navigation';
import { DashboardLayout } from './DashboardLayout';
import { DashboardNavigation } from './DashboardNavigation';

/** The sidebar's foot: the space's page on the public site, in a new tab. */
function PublicPageLink({ slug }: { slug: string }) {
  const copy = useCopy();

  return (
    <SidebarMenu className="w-full">
      <SidebarMenuItem>
        <SidebarMenuButton asChild icon={<EyeIcon aria-hidden />} label={copy.dashboard.publicPage}>
          <a href={publicSpacePath(slug)} target="_blank" rel="noreferrer" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The shell of the space in the URL (`:spaceId`, ADR 0016): the switcher, the pages the user's role
 * at that space allows, and the space's public page. Entering a space the user holds a link to
 * remembers it for the landing. A space they hold none at gets no pages; its routes' guards show
 * the 404 or the 403 inside this shell. Each space has a shell of its own, so moving to another
 * space, from the switcher or the history, closes the phone's drawer.
 */
export function SpaceLayout() {
  const copy = useCopy();
  const user = useSession((session) => session.user);
  const spaceId = parseSpaceId(useParams().spaceId);
  const link = user?.spaces.find((space) => space.spaceId === spaceId);
  const slug = useMySpacesQuery().data?.find((space) => space.spaceId === spaceId)?.slug;

  const userId = user?.id;
  const linkedSpaceId = link?.spaceId;
  useEffect(() => {
    if (userId !== undefined && linkedSpaceId !== undefined) {
      rememberSpace(userId, linkedSpaceId);
    }
  }, [userId, linkedSpaceId]);

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
      {link && (
        <DashboardNavigation
          base={spaceOverviewPath(link.spaceId)}
          items={SPACE_NAV.filter((item) => item.roles.includes(link.role))}
        />
      )}
    </DashboardLayout>
  );
}
