import type { AdminGovernorate, AdminGovernorateWithAreas } from '@masaha/shared/lookups';

import type { AreaRow } from '../areas/areas.repository.ts';
import { toAdminArea } from '../areas/areas.mapper.ts';
import type { GovernorateRow } from './governorates.repository.ts';

export function toAdminGovernorate(governorate: GovernorateRow): AdminGovernorate {
  return {
    id: governorate.id,
    nameAr: governorate.nameAr,
    nameEn: governorate.nameEn,
    isActive: governorate.isActive,
  };
}

export function toAdminGovernorateWithAreas(
  governorate: GovernorateRow & { areas: AreaRow[] },
): AdminGovernorateWithAreas {
  return { ...toAdminGovernorate(governorate), areas: governorate.areas.map(toAdminArea) };
}
