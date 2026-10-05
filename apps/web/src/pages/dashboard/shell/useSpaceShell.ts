import { useMySpacesQuery } from '@features/space-links';
import { parseSpaceId, rememberSpace, spaceOverviewPath } from '@shared/routing';
import { useSession } from '@shared/session';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { SPACE_NAV } from '../navigation';

/**
 * The shell of the space in the URL (`:spaceId`, ADR 0016), ready to render: the space, the slug of
 * its public page once known, and the pages the user's role at that space allows, below the
 * space's path (none at a space they hold no link to). Entering a space the user holds a link to
 * remembers it for the landing.
 */
export function useSpaceShell() {
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

  return {
    spaceId,
    slug,
    navigation: link && {
      base: spaceOverviewPath(link.spaceId),
      items: SPACE_NAV.filter((item) => item.roles.includes(link.role)),
    },
  };
}
