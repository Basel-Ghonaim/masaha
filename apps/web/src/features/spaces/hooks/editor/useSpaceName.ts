import { spaceNameOf, type SpaceNameView } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import { useSpaceQuery } from './useSpaceQuery';

/**
 * A space's name in the interface's language, marked when it is not the interface's, once the space
 * has loaded: what a page titled by it shows. Nothing until then, nor once the space is found
 * deleted, whatever was read before.
 */
export function useSpaceName(spaceId: number): SpaceNameView | undefined {
  const english = useLanguage() === 'en';
  const query = useSpaceQuery('admin', spaceId);
  const space = query.error?.status === 404 ? undefined : query.data;
  return space === undefined ? undefined : spaceNameOf(space, english);
}
