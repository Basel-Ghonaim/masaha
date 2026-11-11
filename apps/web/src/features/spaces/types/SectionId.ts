import type { FactGroup } from '@masaha/shared/spaces';

/**
 * The space profile's sections, in the public page's order (G2): each its anchor, its place in the
 * index and, but the photos, the Sheet it is edited in (`?sheet=`).
 */
export const SECTION_IDS = [
  'photos',
  'prices',
  'hours',
  'shifts',
  'amenities',
  'about',
  'location',
  'contacts',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** A section edited in a Sheet of its own: every one but the photos, edited in place (P2). */
export type SheetId = Exclude<SectionId, 'photos'>;

export const SHEET_IDS = SECTION_IDS.filter((section): section is SheetId => section !== 'photos');

/**
 * The fact group a section's facts are saved, dated and confirmed with: «عن المساحة» and «الموقع»
 * share the profile's, «الورديات» the hours' (the API's groups, decisions F1 and F3).
 */
export const SECTION_GROUPS: Record<SheetId, FactGroup> = {
  prices: 'prices',
  hours: 'hours',
  shifts: 'hours',
  amenities: 'amenities',
  about: 'profile',
  location: 'profile',
  contacts: 'contacts',
};

/** The seven sections «اكتمال الملف» counts: the shifts are optional, so never counted (H2). */
export const COUNTED_SECTIONS = [
  'photos',
  'prices',
  'hours',
  'amenities',
  'about',
  'location',
  'contacts',
] as const satisfies readonly SectionId[];

/** Whether a value names a section edited in a Sheet, as an address's `?sheet=` may. */
export function isSheetId(value: string | null): value is SheetId {
  return SHEET_IDS.some((section) => section === value);
}
