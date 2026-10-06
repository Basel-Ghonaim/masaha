import { englishPlural } from '../plural';

/** The admin's lookup lists: the governorates and their areas. */
export const LOOKUPS = {
  /** The page's hint, under its title. */
  hint: 'Hidden: not shown in filters and forms. Spaces already using it stay as they are. The order here is the display order.',
  governorates: {
    /** The section's name. */
    title: 'Governorates and areas',
    /** A governorate's count of areas. */
    areaCount: ({ count }: { count: number }) =>
      englishPlural(count, { one: `${String(count)} area`, other: `${String(count)} areas` }),
    empty: 'No governorates yet',
    emptyHint: 'Add the first governorate, then its areas.',
    loadFailed: 'We couldn’t load the governorates',
  },
  row: {
    /** The badge of a hidden governorate or area. */
    hidden: 'Hidden',
  },
} as const;
