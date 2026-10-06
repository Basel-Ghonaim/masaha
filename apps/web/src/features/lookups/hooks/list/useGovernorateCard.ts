import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';

/**
 * One governorate's card, ready to render: its names, English first (the line most names are used
 * in), its count of areas, whether it is hidden, and its areas in order.
 */
export function useGovernorateCard(governorate: AdminGovernorateWithAreas) {
  const copy = useCopy();

  return {
    nameEn: governorate.nameEn,
    nameAr: governorate.nameAr,
    hidden: !governorate.isActive,
    countLine: copy.lookups.governorates.areaCount({ count: governorate.areas.length }),
    hiddenLabel: copy.lookups.row.hidden,
    areas: governorate.areas.map((area) => ({
      id: area.id,
      nameEn: area.nameEn,
      nameAr: area.nameAr,
      hidden: !area.isActive,
    })),
  };
}
