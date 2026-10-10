/** A space's life on the platform, as the admin keeps it: add, hide, show, delete and undo. */
export const SPACES = {
  /** The add-space form: a space's basics and its location, sent once. */
  add: {
    basics: 'Basics',
    location: 'Location',
    nameAr: 'Name in Arabic',
    nameEn: 'Name in English',
    descriptionAr: 'Description in Arabic',
    descriptionEn: 'Description in English',
    area: 'Area',
    addressAr: 'Address in Arabic',
    addressEn: 'Address in English',
    landmarkAr: 'Landmark in Arabic',
    landmarkEn: 'Landmark in English',
    /** Beside the label of a field that may stay empty. */
    optional: 'Optional',
    pin: 'Pin on the map',
    /** The map's name, for assistive technology. */
    map: 'Map of the Gaza Strip: click to place the space’s pin',
    pinHint:
      'Click the map to place the pin at the space’s entrance, then drag it to adjust. Or enter its coordinates.',
    coordinates: 'Coordinates',
    coordinatesHint: ({ example }: { example: string }) =>
      `Latitude, then longitude, as a map copies them: ${example}`,
    submit: 'Add space',
    failureTitle: 'Couldn’t add the space',
    /** Two creations of one name at once took the address it chose (409). */
    conflict: 'Another space with this name was added at the same moment. Add it again.',
    fieldErrors: {
      nameEn: {
        too_short: 'Enter the English name',
        invalid_format: 'Use Latin letters or digits in the English name',
      },
      addressAr: { too_short: 'Enter the Arabic address' },
      areaId: {
        required: 'Choose the area',
        invalid_choice: 'This area is no longer available. Choose another.',
      },
      location: {
        required: 'Place the pin on the map, or enter its coordinates',
        invalid_format: 'Enter the coordinates as the latitude, then the longitude',
        out_of_range: 'This point is outside the Gaza Strip',
      },
    },
  },
  /** A space's row menu. */
  menu: {
    /** The menu's button, named after its space. */
    actions: ({ name }: { name: string }) => `Actions: ${name}`,
    hide: 'Hide',
    show: 'Show',
    delete: 'Delete',
  },
  /** The confirmation before a space is deleted. */
  deleteDialog: {
    title: ({ name }: { name: string }) => `Delete ${name}?`,
    description: 'It leaves the site and this list. You can undo it right after.',
    cancel: 'Cancel',
    confirm: 'Delete',
  },
  /** What an action did, once the list shows it. */
  toasts: {
    added: ({ name }: { name: string }) => `${name} added`,
    hidden: ({ name }: { name: string }) => `${name} is hidden from the site`,
    shown: ({ name }: { name: string }) => `${name} is visible again`,
    deleted: ({ name }: { name: string }) => `${name} deleted`,
    /** Restores the space just deleted. */
    undo: 'Undo',
    restored: ({ name }: { name: string }) => `${name} restored`,
  },
  /** An action that failed, named after its space. */
  failures: {
    hide: ({ name }: { name: string }) => `Couldn’t hide ${name}`,
    show: ({ name }: { name: string }) => `Couldn’t show ${name}`,
    delete: ({ name }: { name: string }) => `Couldn’t delete ${name}`,
    restore: ({ name }: { name: string }) => `Couldn’t restore ${name}`,
  },
} as const;
