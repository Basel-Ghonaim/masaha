import type { AmenityIconKey } from './amenityIcons.ts';

// The admin's lookups (docs/api/api-contract.md §5, Lookups). A list's order is its array's order.

/** A governorate as the admin keeps it; a hidden one has `isActive: false`. */
export interface AdminGovernorate {
  id: number;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}

/** An area as the admin keeps it. Its governorate is set when it is added, and never changes. */
export interface AdminArea {
  id: number;
  governorateId: number;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}

/** A governorate with its areas, hidden ones included, in order. */
export interface AdminGovernorateWithAreas extends AdminGovernorate {
  areas: AdminArea[];
}

/** An amenity as the admin keeps it; a retired one has `isActive: false`. */
export interface AdminAmenity {
  id: number;
  /** snake_case, derived from the English name when it was added; never changes. */
  key: string;
  nameAr: string;
  nameEn: string;
  icon: AmenityIconKey;
  isActive: boolean;
  /** Offered in the directory's filter. */
  isFilterable: boolean;
}

// The public catalogue (GET /lookups): only what is active, in order, for the forms and the
// directory's filters.

/** An active area, as the forms offer it. */
export interface CatalogueArea {
  id: number;
  nameAr: string;
  nameEn: string;
}

/** An active governorate with its active areas, in order. */
export interface CatalogueGovernorate {
  id: number;
  nameAr: string;
  nameEn: string;
  areas: CatalogueArea[];
}

/** An active amenity. */
export interface CatalogueAmenity {
  id: number;
  key: string;
  nameAr: string;
  nameEn: string;
  icon: AmenityIconKey;
  /** Offered in the directory's filter. */
  isFilterable: boolean;
}

/** The active lookups, both languages, each list in order. */
export interface LookupsCatalogue {
  governorates: CatalogueGovernorate[];
  amenities: CatalogueAmenity[];
}
