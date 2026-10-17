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
    /** Each fact group's section, by one name in the navigation and on its card, and the gallery's. */
    sections: {
      profile: 'The space',
      hours: 'Opening hours',
      prices: 'Prices',
      amenities: 'Amenities',
      contacts: 'Contacts',
      photos: 'Photos',
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
      /** While a photo is being uploaded, which is the one thing leaving would lose. */
      uploadTitle: 'Leave while an upload is running?',
      uploading: 'A photo that has not finished uploading will be lost.',
      stay: 'Stay',
      leave: 'Leave',
    },
    /** «ساعات العمل»: the week, Saturday first, each day open or closed, and the shifts. */
    hours: {
      /** The days by the catalogue's key, to compose a line. */
      days: {
        saturday: 'Saturday',
        sunday: 'Sunday',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
      },
      open: 'Open',
      closed: 'Closed',
      /** Names a day's switch. */
      openOn: ({ day }: { day: string }) => `Open on ${day}`,
      from: 'From',
      to: 'To',
      /** A time field's placeholder: 24-hour, Western digits. */
      timeExample: '08:00',
      copyAll: 'Copy to all days',
      copyHint: ({ day }: { day: string }) =>
        `“Copy to all days” copies ${day}’s hours to every open day.`,
      /** Beside the disabled copy, while no day is open. */
      noOpenDay: 'Open at least one day.',
      shifts: 'Shifts',
      shiftsHint: 'Optional. Each shift lies inside the hours of at least one open day.',
      shift: ({ position }: { position: number }) => `Shift ${String(position)}`,
      nameAr: 'Name in Arabic',
      nameEn: 'Name in English',
      addShift: 'Add shift',
      /** Beside the disabled "Add shift", at the contract's limit. */
      shiftLimit: 'Up to 10 shifts',
      removeShift: 'Remove shift',
      removeShiftNamed: ({ position }: { position: number }) => `Remove shift ${String(position)}`,
      /** Beside a shift's disabled Remove, while a saved price uses it. */
      inUse: 'A price uses it — remove that price first',
      /** A shift's helper: the open days it does not fit. */
      notOn: ({ days }: { days: string }) => `Doesn’t apply on ${days}`,
      range: ({ from, to }: { from: string; to: string }) => `${from}–${to}`,
      /** A verified space with no hours, read-only. */
      none: 'No opening hours yet',
      /** A removed shift still in use (409). */
      inUse409:
        'A shift you removed is still used by a price, a package or a subscription, so nothing was saved. Change what uses it first.',
      /** A shift removed meanwhile by another admin (422 on a shift's id). */
      shiftsChanged:
        'This space’s shifts changed since the page was opened. Discard your changes to see them as saved.',
      fieldErrors: {
        opens: { required: 'Enter a time', invalid_format: 'A time from 00:00 to 23:59' },
        closes: {
          required: 'Enter a time',
          invalid_format: 'A time up to 24:00, such as 18:30',
          out_of_range: 'Must be after the start',
        },
        nameAr: {
          too_short: 'Enter the shift’s Arabic name',
          too_long: '40 characters at most',
          not_unique: 'A repeated shift name',
        },
        nameEn: { too_long: '40 characters at most' },
        /** A shift inside no open day. */
        outside: 'Outside the hours of every open day',
        noneOpen: 'No day is open yet',
      },
    },
    /** «الأسعار»: the prices, for display only; each a period, an audience, a shift, a label. */
    prices: {
      intro: 'For display only: payment is at the space. Leave out the periods it doesn’t offer.',
      /** Above the rows, while the space has no saved shift. */
      noShifts: 'No saved shifts — add shifts first.',
      /** Above the rows, while the opening hours have unsaved changes. */
      hoursUnsaved: 'Save the opening hours for a new shift to show here.',
      period: 'Period',
      audience: 'For',
      shift: 'Shift',
      label: 'Custom label',
      labelEn: 'Label in English',
      labelEnPlaceholder: 'In English (optional)',
      amount: 'Amount (₪)',
      periods: { HOUR: 'Hour', DAY: 'Day', WEEK: 'Week', MONTH: 'Month' },
      audiences: { GENERAL: 'Everyone', STUDENT: 'Students' },
      noShift: 'No shift',
      row: ({ position }: { position: number }) => `Price ${String(position)}`,
      add: 'Add price',
      /** Beside the disabled "Add price", at the contract's limit. */
      limit: 'Up to 40 prices',
      remove: ({ position }: { position: number }) => `Remove price ${String(position)}`,
      /** A verified space's price: its period and audience, then its shift and label. */
      summary: ({ period, audience }: { period: string; audience: string }) =>
        `${period} · ${audience}`,
      withPart: ({ line, part }: { line: string; part: string }) => `${line} · ${part}`,
      /** A verified space with none, read-only. */
      none: 'No prices yet',
      fieldErrors: {
        amount: {
          required: 'Enter the amount',
          invalid_format: 'An amount in shekels, such as 15 or 12.50',
          out_of_range: 'Above zero, up to ₪100000',
        },
        /** A price that repeats another: said on the field that would tell them apart. */
        repeated: 'A repeated price: change this field',
        labelAr: { required: 'The Arabic label first' },
        label: { too_long: '60 characters at most' },
        /** A shift removed meanwhile (422 on the row's shift). */
        shiftGone: 'This shift is no longer the space’s',
      },
    },
    /** «المرافق»: the platform's amenities ticked, and the space's own beside them. */
    amenities: {
      /** Names the platform's amenities to tick. */
      list: 'The list’s amenities',
      /** Before the link to the lookups' amenities, under the list. */
      manageLead: 'To add an amenity to every space’s list:',
      manageLink: 'Manage the amenities list',
      own: 'Extra amenities',
      ownHint: 'Amenities this space has that the list does not.',
      nameAr: 'Name in Arabic',
      nameEn: 'Name in English',
      add: 'Add an extra amenity',
      /** Beside the disabled "Add", at the contract's limit. */
      limit: 'Up to 20 extra amenities',
      remove: ({ position }: { position: number }) => `Remove extra amenity ${String(position)}`,
      fieldErrors: {
        nameAr: {
          too_short: 'Enter the Arabic name, or remove this amenity',
          too_long: '60 characters at most',
          not_unique: 'A repeated amenity',
        },
        nameEn: { too_long: '60 characters at most' },
      },
      /** A ticked amenity retired meanwhile (422 on no field). */
      unavailable: 'An amenity you ticked is no longer offered. Untick it, or reload the page.',
      /** A verified space's platform amenities, read-only. */
      available: 'Available',
    },
    /** «التواصل»: the contract's seven types, each value in its stored form. */
    contacts: {
      type: 'Type',
      value: 'Value',
      types: {
        WHATSAPP: 'WhatsApp',
        PHONE: 'Phone',
        EMAIL: 'Email',
        INSTAGRAM: 'Instagram',
        FACEBOOK: 'Facebook',
        TIKTOK: 'TikTok',
        WEBSITE: 'Website',
      },
      /** A value's example, while it holds none that can be stored. */
      examples: {
        WHATSAPP: '0599 123 456',
        PHONE: '0599 123 456',
        EMAIL: 'name@example.com',
        INSTAGRAM: '@name',
        FACEBOOK: 'facebook.com/name',
        TIKTOK: '@name',
        WEBSITE: 'example.com',
      },
      storedAs: ({ value }: { value: string }) => `Stored as ${value}`,
      example: ({ value }: { value: string }) => `For example: ${value}`,
      /** A phone's carrier, read from its prefix. */
      carriers: { jawwal: 'Jawwal', ooredoo: 'Ooredoo' },
      add: 'Add contact',
      limit: 'Up to 20 contacts',
      remove: ({ position }: { position: number }) => `Remove contact ${String(position)}`,
      fieldErrors: {
        empty: 'Fill in the value, or remove this contact',
        phone: 'Not a valid number: a Palestinian or Israeli one',
        email: 'Not a valid email',
        link: 'Not a valid link or name for this type',
        not_unique: 'A repeated contact',
        too_long: '200 characters at most',
      },
      /** A verified space with none, read-only. */
      none: 'No contacts yet',
    },
    /** «الصور»: the gallery. Photos are no fact group: they carry no date and confirm nothing. */
    photos: {
      intro:
        'Up to 10 photos · JPEG, PNG or WebP · 4 MB each. The first is the cover, and every change is saved at once.',
      loadFailed: 'We couldn’t load the photos',
      empty: {
        title: 'No photos yet',
        text: 'The first photo becomes the cover.',
      },
      cover: 'Cover',
      photo: ({ position }: { position: number }) => `Photo ${String(position)}`,
      beforeNamed: ({ photo }: { photo: string }) => `Before: ${photo}`,
      afterNamed: ({ photo }: { photo: string }) => `After: ${photo}`,
      makeCover: 'Make it the cover',
      makeCoverNamed: ({ photo }: { photo: string }) => `Make ${photo} the cover`,
      removeNamed: ({ photo }: { photo: string }) => `Remove ${photo}`,
      removeDialog: {
        title: ({ photo }: { photo: string }) => `Delete ${photo}?`,
        description: 'It leaves the space’s page at once and cannot be brought back.',
        cancel: 'Back',
        confirm: 'Delete',
      },
      moved: ({ photo, position, total }: { photo: string; position: number; total: number }) =>
        `${photo} is now at position ${String(position)} of ${String(total)}`,
      covered: ({ photo }: { photo: string }) => `${photo} is the cover now`,
      orderChanged:
        'The photos changed since this page was opened. We refreshed them; check the order and try again.',
      choose: 'Add photos',
      limitReason: 'Up to 10 photos — remove one to add another',
      /** What went up of what was chosen, when the gallery had not the room for all of it. */
      summary: ({ uploaded, selected }: { uploaded: number; selected: number }) =>
        `Uploaded ${String(uploaded)} of ${String(selected)}; the limit is 10 photos`,
      /** The browser is reading the file and shrinking it. */
      preparing: 'Preparing…',
      uploading: ({ percent }: { percent: number }) => `Uploading ${String(percent)}%`,
      /** The browser has no codec for the file, so nothing was sent for it. */
      unsupported: 'Unsupported format; choose JPEG, PNG or WebP',
      /** Over the contract's 4 MiB, after the browser's own shrinking. */
      tooLarge: 'Larger than 4 MB; choose a smaller photo',
      /** The upload failed with no answer to read from. */
      uploadFailed: 'We couldn’t upload this photo',
      /** The gallery already holds ten, which is all it may hold (409). */
      galleryFull: 'The space already has 10 photos. Remove one to add another.',
      retry: 'Try again',
      drop: 'Take it off the list',
      /** An owner joined while the page was open (403). */
      verifiedMeanwhile: 'The space was verified meanwhile: its owner edits its photos now.',
      /** The space was deleted while the page was open (404). */
      deletedMeanwhile: 'The space was deleted meanwhile.',
    },
    /** A verified space's values, read-only. */
    readOnly: {
      none: '—',
      area: 'Area',
      coordinates: 'Coordinates',
    },
  },
  /** A space's row actions. */
  menu: {
    /** The menu's button, named after its space. */
    actions: ({ name }: { name: string }) => `Actions: ${name}`,
    /** Leads to the space's editor. */
    edit: 'Edit',
    hide: 'Hide',
    show: 'Show',
    delete: 'Delete',
    /** A deleted space's one action, and the button that offers it, named after its space. */
    restore: 'Restore',
    restoreNamed: ({ name }: { name: string }) => `Restore ${name}`,
  },
  /** The confirmation before a space is deleted. */
  deleteDialog: {
    title: ({ name }: { name: string }) => `Delete ${name}?`,
    description: 'It leaves the site and the list; you’ll find it under «Deleted» to restore it.',
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
    photoRemoved: ({ photo }: { photo: string }) => `${photo} deleted`,
  },
  /** An action that failed, named after its space. */
  failures: {
    hide: ({ name }: { name: string }) => `Couldn’t hide ${name}`,
    show: ({ name }: { name: string }) => `Couldn’t show ${name}`,
    delete: ({ name }: { name: string }) => `Couldn’t delete ${name}`,
    restore: ({ name }: { name: string }) => `Couldn’t restore ${name}`,
  },
} as const;
