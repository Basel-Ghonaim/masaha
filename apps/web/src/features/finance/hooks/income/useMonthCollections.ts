import { useIncomeQuery } from './useIncomeQuery';

/**
 * Each staff member's collections this Gaza month, for a page that shows them beside the team
 * (D5.6): what the person collected, in agorot — none collected is 0 —, or `null` while it loads or
 * when the read failed.
 */
export function useMonthCollections(spaceId: number) {
  const result = useIncomeQuery(spaceId, undefined);
  const collections = result.data?.collections;
  return {
    collectedOf: (userId: number): number | null =>
      collections === undefined
        ? null
        : (collections.find((entry) => entry.recordedBy.id === userId)?.totalAgorot ?? 0),
  };
}
