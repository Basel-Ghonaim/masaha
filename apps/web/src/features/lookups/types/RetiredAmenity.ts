/**
 * A retired amenity a space still holds, named by the space's read (`retiredAmenities`), which the
 * public catalogue no longer names, with its icon's key when the read carries it.
 */
export type RetiredAmenity = { id: number; nameAr: string; nameEn: string; iconKey?: string };
