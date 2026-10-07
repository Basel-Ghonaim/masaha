import type { AmenityIconKey } from '@masaha/shared/lookups';
import { englishPlural } from '../plural';

/** The admin's lookup lists: the governorates and their areas, and the amenities. */
export const LOOKUPS = {
  /** The page's hint, under its title. */
  hint: 'Hidden: not shown in filters and forms. Spaces already using it stay as they are. The order here is the display order.',
  governorates: {
    /** The section's name. */
    title: 'Governorates and areas',
    add: 'Add governorate',
    /** A governorate's count of areas. */
    areaCount: ({ count }: { count: number }) =>
      englishPlural(count, { one: `${String(count)} area`, other: `${String(count)} areas` }),
    empty: 'No governorates yet',
    emptyHint: 'Add the first governorate, then its areas.',
    loadFailed: 'We couldn’t load the governorates',
  },
  areas: {
    add: 'Add area',
  },
  amenities: {
    /** The section's name, on its tab and its card. */
    title: 'Amenities',
    /** The card's line under its title. */
    description: '“In filters” is off for what nearly every space has: it tells no space apart.',
    add: 'Add amenity',
    empty: 'No amenities yet',
    emptyHint: 'Add the first amenity.',
    loadFailed: 'We couldn’t load the amenities',
    row: {
      /** The badge of an amenity the directory's filter leaves out. */
      notFiltered: 'Not in filters',
      /** The badge of a retired amenity. */
      inactive: 'Inactive',
      /** A row's filter switch: its words beside it, and its name. */
      inFilters: 'In filters',
      inFiltersName: ({ name }: { name: string }) => `In filters: ${name}`,
      /** A row's active switch: its words beside it, and its name. */
      active: 'Active',
      activeName: ({ name }: { name: string }) => `Active: ${name}`,
    },
  },
  row: {
    /** The badge of a hidden governorate or area. */
    hidden: 'Hidden',
    /** A row's switch: on while it is shown. */
    shown: ({ name }: { name: string }) => `Shown: ${name}`,
    moveUp: ({ name }: { name: string }) => `Move up: ${name}`,
    moveDown: ({ name }: { name: string }) => `Move down: ${name}`,
    edit: 'Edit',
    /** The Edit button's name: the row it opens. */
    editName: ({ name }: { name: string }) => `Edit: ${name}`,
  },
  /** An action on a row that failed, inside its governorate's card. */
  failure: {
    title: 'The change wasn’t saved',
    /** An order set on a list that changed meanwhile, which is shown again as it now stands. */
    orderChanged: 'The order changed meanwhile; the new order is shown. Try again.',
  },
  /** The side sheet that adds or edits a governorate, an area or an amenity. */
  sheet: {
    addGovernorate: 'Add governorate',
    editGovernorate: 'Edit governorate',
    addArea: 'Add area',
    editArea: 'Edit area',
    addAmenity: 'Add amenity',
    editAmenity: 'Edit amenity',
    /** An amenity's icon, chosen from a grid. */
    icon: 'Icon',
    /** An amenity's filter switch. */
    inFilters: 'In filters',
    inFiltersHint: 'Offered in the directory’s filter.',
    /** An amenity's switch, when editing: a new amenity is always active. */
    amenityActive: 'Active',
    amenityActiveHint: 'Inactive: not offered in forms and filters; spaces that have it keep it.',
    nameAr: 'Name in Arabic',
    nameEn: 'Name in English',
    /** The switch, when editing: a new governorate or area is always active. */
    active: 'Active',
    activeHint: 'Hidden: not shown in filters and forms.',
    save: 'Save',
    close: 'Close',
    saveFailed: 'We couldn’t save',
    fieldErrors: {
      nameAr: { too_short: 'Enter the Arabic name' },
      nameEn: {
        too_short: 'Enter the English name',
        /** A new amenity's English name that yields no key. */
        invalid_format: 'Use Latin letters or digits in the English name',
      },
      /** A new amenity's icon, still to choose. */
      icon: { invalid_choice: 'Choose an icon' },
      /** Another governorate, hidden or not, has the Arabic name. */
      governorateTaken: 'Another governorate has this Arabic name',
      /** Another area of the same governorate has the Arabic name. */
      areaTaken: 'Another area of this governorate has this Arabic name',
      /** Another amenity, retired or not, has the key this English name yields. */
      amenityTaken: 'Another amenity has this English name',
    },
  },
  /** Each amenity icon's name, as its option in the grid is called. */
  icons: {
    wifi: 'Wi-Fi',
    zap: 'Lightning',
    sun: 'Sun',
    'plug-zap': 'Power plug',
    coffee: 'Coffee cup',
    users: 'People',
    presentation: 'Presentation board',
    'graduation-cap': 'Graduation cap',
  } satisfies Record<AmenityIconKey, string>,
} as const;
