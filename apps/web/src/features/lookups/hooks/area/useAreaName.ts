import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';

/**
 * A space's area with its governorate, as one line, in the interface's language. It reads the
 * admin's lists, so a hidden area is named too. Empty while they load or once they have failed.
 */
export function useAreaName(areaId: number): string {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const query = useGovernoratesQuery();
  for (const governorate of query.data ?? []) {
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
