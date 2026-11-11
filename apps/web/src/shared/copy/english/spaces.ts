import { englishPlural } from '../plural';

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
  /**
   * The space profile: the owner's «ملف المساحة» and the admin's space editor, one page read as a
   * visitor sees it, each section edited in a Sheet of its own (the photos in place).
   */
  editor: {
    loadFailed: 'We couldn’t load the space',
    /** A verified space on the admin's page: who edits it, and the way to correct a fact. */
    verified: {
      /** Names who edits it: its owners, each isolated, joined by `namesSeparator`. */
      ownedBy: ({ names }: { names: string }) => `Edited by ${names}`,
      namesSeparator: ', ',
      description: 'This space is verified, so it shows here read-only.',
      viewOnSite: 'View on the site',
      /** Before the space's reports, where a fact its owner keeps is corrected. */
      correct: 'To correct a fact:',
      reports: ({ space }: { space: string }) => `${space}’s reports`,
    },
    /** A write's refusal when the space is no longer the owner's to write. */
    owner: {
      meanwhile: {
        forbidden: 'This is no longer open to you at this space; nothing was saved.',
        notFound: 'This space is no longer available to you.',
      },
    },
    privacy:
      'A space’s operating data is private to its management — customers, visits, subscriptions, payments and finance.',
    /** Each fact group by one name, as the overviews count them. */
    sections: {
      profile: 'The space',
      hours: 'Opening hours',
      prices: 'Prices',
      amenities: 'Amenities',
      contacts: 'Contacts',
      photos: 'Photos',
    },
    /** Each section of the profile, by its title, in its index and in its toasts. */
    sectionNames: {
      photos: 'Photos',
      prices: 'Published prices',
      hours: 'Opening hours',
      shifts: 'Shifts',
      amenities: 'Amenities',
      about: 'About the space',
      location: 'Location',
      contacts: 'Contacts',
    },
    /** Names the sections' index, beside them from 1024 px. */
    navigation: 'Profile sections',
    /** A section's state in the index, said beside its dot. */
    states: {
      ok: 'Complete',
      stale: 'May be out of date',
      missing: 'Not added yet',
      optional: 'Optional',
    },
    /** The page's header: a summary of the space, never a section. */
    header: {
      addCover: 'Add a cover photo',
      viewPublic: 'View public page',
      copyLink: 'Copy link',
      copied: 'Public page link copied',
      /** The clipboard refused: the link is shown to copy by hand. */
      copyFailed: 'We couldn’t copy the link. Copy it from here:',
      verified: 'Verified',
      unverified: 'Unverified',
      hidden: 'Hidden from visitors',
      completeness: 'Profile completeness',
      count: ({ done, total }: { done: number; total: number }) =>
        `${String(done)} of ${String(total)} sections`,
      missingPart: ({ section }: { section: string }) => `${section}: not added yet`,
      stalePart: ({ section }: { section: string }) => `${section}: may be out of date`,
      complete: 'The profile is complete and up to date',
      /** The gallery's read failed: the bar never counts a photo it has not read (DI-4). */
      uncounted: 'We couldn’t count the profile: the photos didn’t load',
      /** Names the line of the parts still to do. */
      issues: 'Still to do',
    },
    /** A section's head and its states. */
    section: {
      updated: ({ ago }: { ago: string }) => `Updated ${ago}`,
      /** Older than the platform's threshold. */
      stale: 'May be out of date',
      staleLine: 'It’s been a while since the last update. Check it, and confirm it if it’s right.',
      confirm: 'Still correct',
      confirmed: ({ section }: { section: string }) => `${section} confirmed as still correct`,
      confirmFailureTitle: ({ section }: { section: string }) => `Couldn’t confirm ${section}`,
      edit: 'Edit',
      editNamed: ({ section }: { section: string }) => `Edit ${section}`,
      save: 'Save',
      back: 'Back',
      saved: ({ section }: { section: string }) => `${section} saved — visitors see it now`,
      /** A Sheet saved with nothing changed: nothing was sent. */
      unchanged: 'Nothing changed',
      failureTitle: ({ section }: { section: string }) => `Couldn’t save ${section}`,
      /** An owner joined while the page was open (403). */
      verifiedMeanwhile: 'The space was verified meanwhile: its owner edits it now.',
      /** The space was deleted while the page was open (404). */
      deletedMeanwhile: 'The space was deleted meanwhile.',
      /** A confirmation of a group never saved (409). */
      notSavedYet: 'This section was never saved: save it first.',
      optional: 'Optional',
      required: 'Required',
    },
    /** A Sheet closed with changes in it. */
    discard: {
      title: 'Discard the changes?',
      description: 'Your changes to this section aren’t saved, and will be lost.',
      back: 'Back',
      discard: 'Discard changes',
    },
    /** Leaving the page with a Sheet's changes, or while a photo travels. */
    leave: {
      title: 'Leave with unsaved changes?',
      description: ({ section }: { section: string }) =>
        `Your changes to ${section} aren’t saved, and will be lost.`,
      /** While a save of them is pending. */
      saving: ({ section }: { section: string }) => `The changes to ${section} are being saved.`,
      /** While a photo is being uploaded, which is the one thing leaving would lose. */
      uploadTitle: 'Leave while an upload is running?',
      uploading: 'A photo that has not finished uploading will be lost.',
      stay: 'Stay',
      leave: 'Leave',
    },
    /** «الصور»: the gallery, edited in place. Photos are no fact group: no date, no confirmation. */
    photos: {
      count: ({ count }: { count: number }) => `${String(count)} of 10 photos`,
      manage: 'Manage photos',
      done: 'Done',
      cover: 'Cover',
      /** The cover's badge of how many photos there are, on a phone. */
      total: ({ count }: { count: number }) =>
        englishPlural(count, { one: '1 photo', other: `${String(count)} photos` }),
      more: ({ count }: { count: number }) => `+${String(count)}`,
      moreNamed: ({ count }: { count: number }) =>
        englishPlural(count, { one: 'and 1 more', other: `and ${String(count)} more` }),
      others: 'The other photos',
      photo: ({ position }: { position: number }) => `Photo ${String(position)}`,
      coverNamed: ({ photo }: { photo: string }) => `${photo}, the cover`,
      empty: {
        text: 'No photos yet.',
        hint: 'The first photo is your space’s cover in the directory.',
        action: 'Add photos',
      },
      choose: 'Choose photos',
      limits: 'Up to 10 photos · JPEG, PNG or WebP · up to 4 MB each',
      full: 'You’ve reached the limit (10 photos). Delete one to add another.',
      list: 'The photos, in order',
      removeNamed: ({ photo }: { photo: string }) => `Delete ${photo}`,
      removeDialog: {
        title: 'Delete this photo?',
        description: 'It leaves the space’s page at once, and can’t be brought back.',
        nextCover: 'The next photo becomes the cover.',
        cancel: 'Back',
        confirm: 'Delete',
      },
      loadFailed: 'We couldn’t load the photos',
      orderFailed: 'We couldn’t change the photos’ order',
      removeFailed: 'We couldn’t delete the photo',
      orderChanged:
        'The photos changed since this page was opened. We refreshed them; check the order and try again.',
      /** What went up of what was chosen, when the gallery had not the room for all of it. */
      summary: ({ uploaded, selected }: { uploaded: number; selected: number }) =>
        `Uploaded ${String(uploaded)} of ${String(selected)}; the limit is 10 photos`,
      /** The browser is reading the file and shrinking it. */
      preparing: 'Preparing…',
      uploading: ({ percent }: { percent: number }) => `Uploading ${String(percent)}%`,
      /** An uploading tile's bar: the photo's place in the gallery, and its percentage. */
      uploadingPhoto: ({ n }: { n: number }) => `Uploading photo ${String(n)}`,
      percent: ({ percent }: { percent: number }) => `${String(percent)}%`,
      /** The browser has no codec for the file, so nothing was sent for it. */
      unsupported: 'Unsupported format; choose JPEG, PNG or WebP',
      /** Over the contract's 4 MiB, after the browser's own shrinking. */
      tooLarge: 'Larger than 4 MB; choose a smaller photo',
      /** The upload failed with no answer to read from. */
      uploadFailed: 'We couldn’t upload this photo',
      /** The gallery already holds ten, which is all it may hold (409). */
      galleryFull: 'The space already has 10 photos. Delete one to add another.',
      retry: 'Try again',
      drop: 'Take it off the list',
      /** An owner joined while the page was open (403). */
      verifiedMeanwhile: 'The space was verified meanwhile: its owner edits its photos now.',
      /** The space was deleted while the page was open (404). */
      deletedMeanwhile: 'The space was deleted meanwhile.',
    },
    /** «الأسعار المعلنة»: the prices, for display only (R6–R9); «سعر», never «اشتراك» (R8). */
    prices: {
      sheetTitle: 'Edit the published prices',
      sheetDescription:
        'Shown on your space’s page and in the directory · display only · paid at the space',
      sheetHint: 'Each row is one price. Add only what you offer.',
      caption: 'Published prices',
      period: 'Period',
      audience: 'For',
      shift: 'Shift',
      amount: 'Amount (₪)',
      price: 'Price',
      periods: { HOUR: 'Hour', DAY: 'Day', WEEK: 'Week', MONTH: 'Month' },
      /** A period as the table names it. */
      periodsView: { HOUR: 'Hourly', DAY: 'Daily', WEEK: 'Weekly', MONTH: 'Monthly' },
      audiences: { GENERAL: 'Everyone', STUDENT: 'Students' },
      audiencesView: { GENERAL: 'Everyone', STUDENT: 'Students' },
      noShift: 'No shift',
      row: ({ position }: { position: number }) => `price ${String(position)}`,
      /** A field's name on a wide row, whose column heads it: the column, then the row. */
      cell: ({ column, row }: { column: string; row: string }) => `${column} — ${row}`,
      add: 'Add a price',
      /** Beside the disabled "Add a price", at the contract's limit. */
      limit: 'Up to 40 prices',
      remove: ({ position }: { position: number }) => `Remove price ${String(position)}`,
      addShiftLead: 'Want a price for part of the day?',
      addShiftLink: 'Add a shift',
      /** The Sheet with no row left. */
      noneLeft: 'No prices. Save like this and the directory says prices aren’t available.',
      viewNote: 'Display only · paid at the space.',
      /** The owner's: where else the prices show. */
      ownerNote: 'Packages & prices shows them read-only.',
      empty: { text: 'No prices yet.', action: 'Add a price' },
      fieldErrors: {
        amount: {
          required: 'Enter the amount',
          invalid_format: 'An amount in shekels, such as 15 or 12.50',
          out_of_range: 'Above zero, up to ₪100000',
        },
        /** The same period, audience and shift twice: said on the later row. */
        repeated: 'This price is already added',
        /** A shift removed meanwhile (422 on the row's shift). */
        shiftGone: 'This shift is no longer the space’s',
      },
      /** The owner's Packages & prices: the prices read-only, edited in the profile only (R1). */
      card: {
        description: 'Shown on your space’s page · display only · paid at the space',
        edit: 'Edit the prices in the space profile',
      },
    },
    /** «ساعات العمل»: the week, the majority first (W1–W5). */
    hours: {
      /** The week's rows, Saturday first. */
      week: {
        dayNames: {
          sat: 'Saturday',
          sun: 'Sunday',
          mon: 'Monday',
          tue: 'Tuesday',
          wed: 'Wednesday',
          thu: 'Thursday',
          fri: 'Friday',
        },
        pair: ({ first, second }: { first: string; second: string }) => `${first}, ${second}`,
        run: ({ first, last }: { first: string; last: string }) => `${first} – ${last}`,
        closed: 'Closed',
        allDay: 'Open around the clock',
      },
      today: 'Today',
      caption: 'The weekly opening hours',
      closureLead: 'Closing for a while?',
      closureLink: 'Add a closure announcement in Announcements',
      empty: {
        text: 'Opening hours aren’t available.',
        hint: 'Without them, visitors can’t tell whether the space is open now.',
        action: 'Add the opening hours',
      },
      sheetTitle: 'Edit the opening hours',
      sheetDescription: 'They decide “Open now” in the directory.',
      weekdays: 'Saturday to Thursday',
      from: 'From',
      to: 'To',
      fridayOpen: 'Also open on Friday',
      friday: 'Friday',
      fridayFrom: 'Friday from',
      fridayClosed: 'Friday: closed',
      customise: 'Set each day',
      customHint: 'Each day its own hours, or closed.',
      simple: 'Back to the simple view',
      open: 'Open',
      dayOff: 'Closed',
      openOn: ({ day }: { day: string }) => `Open on ${day}`,
      unify: {
        title: 'Every day will take the same hours. Continue?',
        description:
          'Saturday to Thursday take the hours of the first of them that’s open; Friday stays as it is.',
        back: 'Back',
        continue: 'Continue',
      },
      noneOpen: 'Open at least one day.',
      after: '“To” comes after “From”',
      /** A saved shift the new week no longer holds (DI-2). */
      shiftOutside: ({ name }: { name: string }) =>
        `The shift “${name}” is outside the new hours. Edit the shifts first, or choose hours that hold it.`,
      shiftOutsideLink: 'Edit the shifts',
      /** A shift removed meanwhile by another admin (422 on a shift's id). */
      shiftsChanged:
        'This space’s shifts changed since the page was opened. Close this and open it again to see them as saved.',
    },
    /** «الورديات»: optional, for prices and packages that cover part of the day (S1–S5, X1). */
    shifts: {
      sheetTitle: 'Edit the shifts',
      sheetDescription: 'Optional: for prices and packages that cover part of the day.',
      hint: 'Each shift lies inside the hours of at least one open day.',
      shift: ({ position }: { position: number }) => `Shift ${String(position)}`,
      nameAr: 'Name in Arabic',
      nameEn: 'Name in English',
      placeholderAr: 'e.g. المسائية',
      placeholderEn: 'e.g. Evening',
      from: 'From',
      to: 'To',
      add: 'Add a shift',
      /** Beside the disabled "Add a shift", at the contract's limit. */
      limit: 'Up to 10 shifts',
      remove: ({ position }: { position: number }) => `Remove shift ${String(position)}`,
      /** Beside a shift's disabled Remove, while a saved price or a package uses it. */
      inUse: 'A price or a package uses this shift; take it off there first.',
      /** A shift's helper: the open days it does not fit. */
      notOn: ({ days }: { days: string }) => `Doesn’t apply on ${days}`,
      range: ({ from, to }: { from: string; to: string }) => `${from}–${to}`,
      separator: ' · ',
      empty: {
        text: 'No shifts.',
        hint: 'Shifts are optional: you need them for prices or packages that cover part of the day.',
        action: 'Add a shift',
      },
      /** No hours saved yet, which a shift must lie inside (DI-1). */
      noHours: {
        text: 'Add the opening hours first, then the shifts.',
        action: 'Add the opening hours',
      },
      /** A removed shift still in use (409), by something this page cannot see. */
      inUse409:
        'A shift you removed is still used by a price, a package, a subscription or a visit, so nothing was saved. Change what uses it first.',
      shiftsChanged:
        'This space’s shifts changed since the page was opened. Close this and open it again to see them as saved.',
      fieldErrors: {
        nameAr: {
          too_short: 'Enter the shift’s name',
          too_long: '40 characters at most',
          not_unique: 'A repeated shift name',
        },
        nameEn: { too_long: '40 characters at most' },
        after: '“To” comes after “From”',
        /** A shift inside no open day. */
        outside: 'Outside the hours of every open day',
      },
    },
    /** «المرافق»: only what the space offers (A1–A2). */
    amenities: {
      sheetTitle: 'Edit the amenities',
      list: 'What the space offers',
      /** Before the link to the lookups' amenities, under the list; the admin's alone. */
      manageLead: 'To add an amenity to every space’s list:',
      manageLink: 'Manage the amenities list',
      own: 'Other amenities',
      ownHint: 'What your space offers that the list doesn’t have.',
      nameAr: 'Name in Arabic',
      nameEn: 'Name in English',
      add: 'Add another amenity',
      /** Beside the disabled "Add", at the contract's limit. */
      limit: 'Up to 20 amenities',
      remove: ({ position }: { position: number }) => `Remove amenity ${String(position)}`,
      fieldErrors: {
        nameAr: {
          too_short: 'Enter the Arabic name, or remove this row',
          too_long: '60 characters at most',
          not_unique: 'A repeated amenity',
        },
        nameEn: { too_long: '60 characters at most' },
      },
      /** An own amenity that names one of the platform's list. */
      inCatalogue: 'This amenity is in the list: tick it above',
      /** A ticked amenity retired meanwhile (422 on no field). */
      unavailable: 'We took an amenity no longer offered out of your choice; save again.',
      offered: 'The amenities the space offers',
      /** The platform's list, which names the amenities the space offers, could not be read. */
      listFailed: 'We couldn’t load the amenities list',
      empty: { text: 'No amenities yet.', action: 'Add the amenities' },
    },
    /** «عن المساحة»: the names and the descriptions, each language its own (B1–B2). */
    about: {
      sheetTitle: 'Edit: about the space',
      inArabic: 'In Arabic',
      inEnglish: 'In English',
      nameAr: 'Name in Arabic',
      nameEn: 'Name in English',
      descriptionAr: 'Description in Arabic',
      descriptionEn: 'Description in English',
      slugNote: 'Changing the name doesn’t change your page’s link.',
      count: ({ count, max }: { count: number; max: number }) =>
        `${String(count)} / ${String(max)}`,
      noArabicName: 'No Arabic name yet.',
      noArabicDescription:
        'No Arabic description yet. Visitors using the site in Arabic won’t see a description of your space.',
      noEnglishDescription:
        'No English description yet. Visitors using the site in English won’t see a description of your space.',
      more: 'Show more',
      less: 'Show less',
      fieldErrors: {
        nameEn: {
          too_short: 'Enter the English name',
          too_long: '80 characters at most',
          invalid_format: 'Use Latin letters or digits in the English name',
        },
        nameAr: { too_long: '80 characters at most' },
        description: { too_long: '1000 characters at most' },
      },
    },
    /** «الموقع»: the area, the addresses, the landmark and the pin (L1–L2). */
    location: {
      sheetTitle: 'Edit the location',
      area: 'Area',
      addressAr: 'Address in Arabic',
      addressEn: 'Address in English',
      landmarkAr: 'Landmark in Arabic',
      landmarkEn: 'Landmark in English',
      /** Before the landmark, which follows in its own language. */
      landmark: 'Landmark:',
      noEnglishAddress:
        'No English address yet. Visitors using the site in English see the Arabic one.',
      openMaps: 'Open in Google Maps',
      mapLabel: 'The space on the map',
      mapFailed: 'The map didn’t load.',
      pin: 'Pin on the map',
      map: 'Map of the Gaza Strip: tap to place the space’s pin',
      pinHint: 'Tap the map at the space’s entrance to place the pin, then drag it to adjust it.',
      useMine: 'Use my current location',
      moved: 'The pin moved to where you are now. Adjust it if needed.',
      outside: 'The location is outside the Gaza Strip',
      locateFailed:
        'We couldn’t tell where you are. Let the browser know your location, or place the pin on the map.',
      coordinates: 'Coordinates',
      fieldErrors: {
        addressAr: { too_short: 'Enter the Arabic address', too_long: '200 characters at most' },
        addressEn: { too_long: '200 characters at most' },
        landmark: { too_long: '120 characters at most' },
        areaId: {
          required: 'Choose the area',
          invalid_choice: 'This area is no longer offered. Choose another.',
        },
        location: {
          required: 'Place the pin on the map, or enter its coordinates',
          invalid_format: 'Enter the coordinates as the latitude, then the longitude',
          out_of_range: 'The location is outside the Gaza Strip',
        },
      },
    },
    /** «التواصل»: every way the owner has (C1–C2, M3–M4), in the order visitors see them. */
    contacts: {
      sheetTitle: 'Edit the contacts',
      sheetDescription: 'The first shows first to visitors.',
      type: 'Type',
      label: 'Name',
      labelPlaceholder: 'e.g. Discord',
      otherValue: 'Link or number',
      types: {
        WHATSAPP: 'WhatsApp',
        PHONE: 'Phone',
        EMAIL: 'Email',
        INSTAGRAM: 'Instagram',
        FACEBOOK: 'Facebook',
        TELEGRAM: 'Telegram',
        TIKTOK: 'TikTok',
        X: 'X (Twitter)',
        LINKEDIN: 'LinkedIn',
        YOUTUBE: 'YouTube',
        WEBSITE: 'Website',
        OTHER: 'Other',
      },
      /** A value's placeholder, by its type. */
      placeholders: {
        WHATSAPP: '0599123456',
        PHONE: '0599123456',
        EMAIL: 'name@example.com',
        INSTAGRAM: 'Account name or link',
        FACEBOOK: 'Page name or link',
        TELEGRAM: 'Account name or link',
        TIKTOK: 'Account name or link',
        X: 'Account name or link',
        LINKEDIN: 'Page link',
        YOUTUBE: 'Channel link',
        WEBSITE: 'https://…',
        OTHER: 'Link or number',
      },
      storedAs: ({ value }: { value: string }) => `Saved as ${value}`,
      /** A phone's carrier, read from its prefix. */
      carriers: { jawwal: 'Jawwal', ooredoo: 'Ooredoo' },
      withCarrier: ({ type, carrier }: { type: string; carrier: string }) => `${type} (${carrier})`,
      add: 'Add a contact',
      limit: 'Up to 20 contacts',
      remove: ({ name }: { name: string }) => `Remove ${name}`,
      list: 'The contacts, in order',
      offered: 'The space’s contacts',
      empty: {
        text: 'No contacts yet. Visitors won’t find a way to reach you.',
        action: 'Add a contact',
      },
      fieldErrors: {
        empty: 'Fill in the value, or remove this contact',
        /** A value its type cannot store, in its type's words. */
        invalid: {
          WHATSAPP: 'Not a valid WhatsApp number',
          PHONE: 'Not a valid phone number',
          EMAIL: 'Not a valid email',
          INSTAGRAM: 'Not a valid account name or link',
          FACEBOOK: 'Not a valid page name or link',
          TELEGRAM: 'Not a valid account name or link',
          TIKTOK: 'Not a valid account name or link',
          X: 'Not a valid account name or link',
          LINKEDIN: 'Not a valid page link: paste the page’s full link',
          YOUTUBE: 'Not a valid channel name or link',
          WEBSITE: 'Not a valid link',
          OTHER: 'Enter a valid link or number',
        },
        not_unique: 'This contact is already added',
        too_long: '200 characters at most',
        label: {
          required: 'Enter the contact’s name',
          too_short: 'Enter the contact’s name',
          too_long: '40 characters at most',
          invalid_format: 'Use letters, digits and spaces in the name',
        },
      },
    },
  },
  /** A space's row actions. */
  menu: {
    /** The menu's button, named after its space. */
    actions: ({ name }: { name: string }) => `Actions: ${name}`,
    /** Leads to the space's editor. */
    edit: 'Edit',
    /** A verified space's: its owner edits it, the admin views it. */
    view: 'View (its owner edits it)',
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
    cancel: 'Back',
    confirm: 'Delete',
  },
  /** What an action did, once the list shows it. */
  toasts: {
    added: ({ name }: { name: string }) => `${name} added`,
    hidden: ({ name }: { name: string }) => `${name} is hidden from the site`,
    shown: ({ name }: { name: string }) => `${name} is visible again`,
    deleted: ({ name }: { name: string }) => `${name} deleted`,
    /** Restores the space just deleted; on a hiding's or a showing's toast, the opposite (P9). */
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
