import { useSpaceQuery } from '../editor/useSpaceQuery';

/** None named: while the space is read, or when the read fails. */
const NONE: readonly { id: number; name: string }[] = [];

/**
 * The space's active owners, as the managed space read answers them to its owner (`owners`, oldest
 * link first; EC10): the one read the owner's editor shares. None while it loads or when it fails.
 */
export function useSpaceOwners(spaceId: number): readonly { id: number; name: string }[] {
  return useSpaceQuery('owner', spaceId).data?.owners ?? NONE;
}
