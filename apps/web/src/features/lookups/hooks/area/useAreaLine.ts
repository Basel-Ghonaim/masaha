import { useCopy } from '@shared/copy';
import type { LookupsSource } from '../../types/LookupsSource';
import { useAreaName } from './useAreaName';
import { useCatalogueQuery } from './useCatalogueQuery';

/**
 * A space's area with its governorate as the space profile writes it, «الرمال، غزة», from the
 * admin's lists or the public catalogue (`source`). The public catalogue names no hidden area, so a
 * space's own area hidden since is «المنطقة الحالية — لم تعد متاحة للاختيار», as the area field says
 * it, once the catalogue has arrived without it. Empty while the lists load or once they have failed.
 */
export function useAreaLine(areaId: number, source: LookupsSource): string {
  const copy = useCopy();
  const name = useAreaName(areaId, source, 'comma');
  const catalogue = useCatalogueQuery({ enabled: source === 'public' });
  if (name === '' && source === 'public' && catalogue.data !== undefined) {
    return copy.lookups.areaSelect.unavailable;
  }
  return name;
}
