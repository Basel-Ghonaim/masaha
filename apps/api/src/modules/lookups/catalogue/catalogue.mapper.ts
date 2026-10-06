import type {
  AmenityIconKey,
  CatalogueAmenity,
  CatalogueGovernorate,
} from '@masaha/shared/lookups';

import type { CatalogueAmenityRow, CatalogueGovernorateRow } from './catalogue.repository.ts';

export function toCatalogueGovernorate(governorate: CatalogueGovernorateRow): CatalogueGovernorate {
  return {
    id: governorate.id,
    nameAr: governorate.nameAr,
    nameEn: governorate.nameEn,
    areas: governorate.areas.map(({ id, nameAr, nameEn }) => ({ id, nameAr, nameEn })),
  };
}

export function toCatalogueAmenity(amenity: CatalogueAmenityRow): CatalogueAmenity {
  return {
    id: amenity.id,
    key: amenity.key,
    nameAr: amenity.nameAr,
    nameEn: amenity.nameEn,
    // Written only from AMENITY_ICON_KEYS: by the seed, typed by it, and by the validated requests.
    icon: amenity.icon as AmenityIconKey,
    isFilterable: amenity.isFilterable,
  };
}
