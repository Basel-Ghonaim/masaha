import type { PublicSpace } from '@masaha/shared/directory';
import { spaceNameOf, type SpaceNameView } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { directoryKeys } from '../queryKeys';

/**
 * The name of the space `slug`, in the interface's language, when this tab already read its page:
 * from the cache only, never a request (DI33's way back). Nothing without a slug or a read held.
 */
export function useCachedSpaceName(slug: string | undefined): SpaceNameView | undefined {
  const english = useLanguage() === 'en';
  const client = useQueryClient();
  if (slug === undefined) return undefined;
  const space = client.getQueryData<PublicSpace>(directoryKeys.space(slug));
  return space === undefined ? undefined : spaceNameOf(space, english);
}
