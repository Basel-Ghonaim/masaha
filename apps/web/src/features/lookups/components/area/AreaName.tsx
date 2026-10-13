import { useAreaName } from '../../hooks/area/useAreaName';

/** A space's area with its governorate, as text: what a read-only page shows. */
export function AreaName({ areaId }: { areaId: number }) {
  return useAreaName(areaId);
}
