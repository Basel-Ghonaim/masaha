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
  /** The space editor: a page per space, each fact group a section saved and confirmed alone. */
  editor: {
    loadFailed: 'We couldn’t load the space',
    /** A space's state: whether it is verified, and whether it is hidden. */
    status: {
      verified: 'Verified',
      unverified: 'Unverified',
      hidden: 'Hidden',
    },
    unverified: {
      title: 'You’re editing an unverified space',
      description:
        'Visitors see that the Masaha team collected this information. Each section saves on its own.',
    },
    verified: {
      title: 'Edited by its owner',
      description: 'This space is verified, so it shows here read-only.',
      viewOnSite: 'View on the site',
    },
    privacy:
      'A space’s operating data is private to its management — customers, visits, subscriptions, payments and finance.',
    /** Each fact group's section, by one name in the navigation and on its card. */
    sections: {
      profile: 'The space',
      hours: 'Opening hours',
      prices: 'Prices',
      amenities: 'Amenities',
      contacts: 'Contacts',
    },
    /** Names the sections' navigation. */
    navigation: 'Profile sections',
    /** The groups never saved, at the head of the page. */
    checklist: {
      title: 'Still missing',
      description: 'Save each section at least once — empty, if it has nothing to add.',
      done: 'Done',
      missing: 'Not added yet',
    },
    section: {
      notAdded: 'Not added yet',
      updated: ({ ago }: { ago: string }) => `Updated ${ago}`,
      /** Older than the platform's threshold. */
      stale: 'Out of date',
      unsaved: 'Unsaved changes',
      save: 'Save',
      discard: 'Discard changes',
      confirm: 'Still correct',
      /** A save of a section that changed nothing: nothing is sent. */
      unchanged: 'Nothing changed. To renew its date, choose “Still correct”.',
      saved: ({ section }: { section: string }) => `${section} saved`,
      confirmed: ({ section }: { section: string }) => `${section} confirmed as still correct`,
      failureTitle: ({ section }: { section: string }) => `Couldn’t save ${section}`,
      confirmFailureTitle: ({ section }: { section: string }) => `Couldn’t confirm ${section}`,
      /** An owner joined while the page was open (403). */
      verifiedMeanwhile: 'The space was verified meanwhile: its owner edits it now.',
      /** The space was deleted while the page was open (404). */
      deletedMeanwhile: 'The space was deleted meanwhile.',
      /** A confirmation of a group never saved (409). */
      notSavedYet: 'This section was never saved: save it first.',
    },
    /** Leaving the page with a section not saved. */
    leave: {
      title: 'Leave with unsaved changes?',
      description: ({ sections }: { sections: string }) =>
        `Unsaved changes in ${sections} will be lost.`,
      /** While a save of them is pending. */
      saving: ({ sections }: { sections: string }) => `The changes in ${sections} are being saved.`,
      stay: 'Stay',
      leave: 'Leave',
    },
    /** A verified space's values, read-only. */
    readOnly: {
      none: '—',
      area: 'Area',
      coordinates: 'Coordinates',
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
