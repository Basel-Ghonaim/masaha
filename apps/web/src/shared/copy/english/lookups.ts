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
    /** A row's switch: on while it is shown. */
    shown: ({ name }: { name: string }) => `Shown: ${name}`,
    moveUp: ({ name }: { name: string }) => `Move up: ${name}`,
    moveDown: ({ name }: { name: string }) => `Move down: ${name}`,
  },
  /** An action on a row that failed, inside its governorate's card. */
  failure: {
    title: 'The change wasn’t saved',
    /** An order set on a list that changed meanwhile, which is shown again as it now stands. */
    orderChanged: 'The order changed meanwhile; the new order is shown. Try again.',
  },
} as const;
