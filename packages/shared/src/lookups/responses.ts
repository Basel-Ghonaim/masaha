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
