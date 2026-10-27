import { useStaffQuery } from '../list/useStaffQuery';

/**
 * The space's reception accounts by name, deactivated ones included and marked, for another
 * capability's screen — the payments ledger's staff filter: the staff list's own query, one cache
 * with «الموظفون».
 */
export function useStaffPeople(spaceId: number) {
  const query = useStaffQuery(spaceId);
  return {
    people: (query.data ?? []).map((member) => ({
      id: member.userId,
      name: member.name,
      active: member.isActive,
    })),
    state: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('failed' as const)
        : ('ready' as const),
  };
}
