import { useAreaLine } from '../../hooks/area/useAreaLine';
import type { LookupsSource } from '../../types/LookupsSource';

/**
 * A space's area with its governorate, as the space profile's header and its location say it,
 * «الرمال، غزة», from the admin's lists or the public catalogue (`source`); on the public one, a
 * space's own area hidden since is said as the current area, no longer offered.
 */
export function AreaLine({ areaId, source }: { areaId: number; source: LookupsSource }) {
  return useAreaLine(areaId, source);
}
