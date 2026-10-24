import type { PinsRequest } from '../../types/PinsRequest';
import { usePinsQuery } from '../map/usePinsQuery';

/** The pins' request with no filter, the map's own key unfiltered: every publicly listed space. */
const EVERY_SPACE: PinsRequest = {};

/**
 * How many publicly listed spaces each area holds, by the area's id, and their total: counted from
 * the map's pins with no filter, one pin a space. `retry` reads them again once they have failed.
 */
export function useAreaCounts(): {
  counts: ReadonlyMap<number, number>;
  total: number;
  state: 'loading' | 'failed' | 'ready';
  retry: () => void;
} {
  const query = usePinsQuery(EVERY_SPACE, true);
  const pins = query.data?.pins ?? [];
  const counts = new Map<number, number>();
  for (const pin of pins) counts.set(pin.areaId, (counts.get(pin.areaId) ?? 0) + 1);

  return {
    counts,
    total: pins.length,
    state: query.data !== undefined ? 'ready' : query.isError ? 'failed' : 'loading',
    retry: () => {
      void query.refetch();
    },
  };
}
