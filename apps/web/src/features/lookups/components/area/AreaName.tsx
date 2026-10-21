import { useAreaName } from '../../hooks/area/useAreaName';
import type { LookupsSource } from '../../types/LookupsSource';

/**
 * A space's area with its governorate, as text: what a read-only page or the site's card shows, from
 * the admin's lists or the public catalogue (`source`).
 */
export function AreaName({ areaId, source }: { areaId: number; source: LookupsSource }) {
  return useAreaName(areaId, source);
}
