import type { SpacePackage } from '@masaha/shared/packages';
import { usePackagesQuery } from '../list/usePackagesQuery';

/** The packages the desk may subscribe from, as their query stands. */
export type OfferedPackages = {
  state: 'loading' | 'failed' | 'ready';
  /** The offered ones only (retired ones left out), in the owner's order; none until ready. */
  packages: SpacePackage[];
  retry: () => void;
};

/**
 * The space's offered packages, for another capability's screen to choose from (the desk's
 * subscription sheet): the owner's list read through its own query, so the two share one cache, with
 * the retired ones left out. Reception may read them (🧾).
 */
export function useOfferedPackages(spaceId: number): OfferedPackages {
  const query = usePackagesQuery(spaceId);
  return {
    state: query.isPending ? 'loading' : query.isError ? 'failed' : 'ready',
    packages: (query.data ?? []).filter(({ isActive }) => isActive),
    retry: () => {
      void query.refetch();
    },
  };
}
