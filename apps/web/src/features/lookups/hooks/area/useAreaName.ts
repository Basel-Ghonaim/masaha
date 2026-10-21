import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import type { LookupsSource } from '../../types/LookupsSource';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';
import { useCatalogueQuery } from './useCatalogueQuery';

/**
 * A space's area with its governorate, as one line, in the interface's language. For the admin
 * (`source`) it reads the admin's lists, so a hidden area is named too; for the site, the public
 * catalogue only, the admin's lists never asked for. Empty while they load or once they have failed.
 */
export function useAreaName(areaId: number, source: LookupsSource): string {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const adminLists = useGovernoratesQuery({ enabled: source === 'admin' });
  const catalogue = useCatalogueQuery({ enabled: source === 'public' });
  const governorates = (source === 'admin' ? adminLists.data : catalogue.data?.governorates) ?? [];
  for (const governorate of governorates) {
    const area = governorate.areas.find((candidate) => candidate.id === areaId);
    if (area !== undefined) {
      return copy.lookups.areaName({
        area: english ? area.nameEn : area.nameAr,
        governorate: english ? governorate.nameEn : governorate.nameAr,
      });
    }
  }
  return '';
}
