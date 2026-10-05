import type { AdminArea } from '@masaha/shared/lookups';

import type { AreaRow } from './areas.repository.ts';

export function toAdminArea(area: AreaRow): AdminArea {
  return {
    id: area.id,
    governorateId: area.governorateId,
    nameAr: area.nameAr,
    nameEn: area.nameEn,
    isActive: area.isActive,
  };
}
