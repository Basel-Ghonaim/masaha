import type { FactGroup } from '@masaha/shared/spaces';

/**
 * The user's links to spaces, in the dashboard: the space switcher, the admin's spaces list and the
 * admin's owners page.
 */
export const SPACE_LINKS = {
  /** The switcher's name, with the space it shows. */
  switchSpace: ({ name }: { name: string }) => `Switch space: ${name}`,
  /** The switcher's list. */
  yourSpaces: 'Your spaces',
  /** The switcher, when the space in the address is none of the user's. */
  chooseSpace: 'Choose a space',
  loadFailed: 'Couldn’t load your spaces',
  /** The admin's spaces list: its filters, its table and cards, its states and its pages. */
  adminList: {
    /** Names the list: the table, the cards on a phone. */
    label: 'Spaces',
    search: 'Search',
    searchPlaceholder: 'Space name',
    /** The one field that chooses a governorate or one of its areas. */
    place: 'Governorate / area',
    status: 'Status',
    allStatuses: 'All statuses',
    /** A space's state, on its badges and as a filter's option. */
    states: {
      verified: 'Verified',
      unverified: 'Unverified',
      hidden: 'Hidden',
      deleted: 'Deleted',
    },
    /** A deleted row's line, by the list's own short date, in place of its badges. */
    deletedOn: ({ date }: { date: string }) => `Deleted · ${date}`,
    /** The chip that keeps the spaces with a stale or a missing fact group. */
    staleOrMissing: 'Stale or missing',
    /** What names that chip, a filter that is not a field. */
    quickFilter: 'Quick filter',
    /** The phone's button that opens the filters, and its sheet's title. */
    filters: 'Filters',
    /** The phone's button's name while filters apply. */
    filtersApplied: ({ count }: { count: number }) => `Filters, ${String(count)} applied`,
    clearFilters: 'Clear filters',
    close: 'Close',
    columns: {
      space: 'Space',
      area: 'Area',
      status: 'Status',
      owner: 'Owner',
      freshness: 'Freshness',
      lastUpdate: 'Last update',
      actions: 'Actions',
    },
    /** A card's owners. */
    owners: ({ owners }: { owners: string }) => `Owner: ${owners}`,
    /** Read aloud in place of the dash of a space with no owner. */
    noOwner: 'No owner',
    upToDate: 'Up to date',
    stale: ({ groups }: { groups: string }) => `Stale: ${groups}`,
    missing: ({ groups }: { groups: string }) => `Missing: ${groups}`,
    /** A space's fact groups, as freshness names them. */
    groups: {
      profile: 'Profile',
      hours: 'Opening hours',
      prices: 'Prices',
      amenities: 'Amenities',
      contacts: 'Contacts',
    } satisfies Record<FactGroup, string>,
    /** Between the names of a list: fact groups, owners. */
    separator: ', ',
    /** The count of spaces the filters keep, under the table. */
    count: ({ count }: { count: number }) => `Spaces: ${String(count)}`,
    empty: 'No spaces yet',
    emptyHint: 'Spaces appear here once they are added.',
    noMatch: 'No spaces match the filters',
    loadFailed: 'We couldn’t load the spaces',
    pagination: {
      label: 'Pages of the spaces list',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      /** Where the list is, on a phone. */
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
  /** The admin's owners page: the users list filtered to the owners, its search and its state. */
  ownersList: {
    /** Names the list: the table, the cards on a phone. */
    label: 'Space owners',
    intro:
      'Linking an owner makes a space verified; from then on the owner edits it and alone sees its operations.',
    search: 'Search',
    searchPlaceholder: 'Name or email',
    /** Names the state chips. */
    state: 'Status',
    states: {
      all: 'All',
      active: 'Active',
      suspended: 'Suspended',
    },
    columns: {
      name: 'Name',
      email: 'Email',
      spaces: 'Linked spaces',
      state: 'Status',
      actions: 'Actions',
    },
    /** An owner whose every space is deleted, the whole line a link to the deleted spaces. */
    allSpacesDeleted: 'All their spaces are deleted — restore the space to unlink them',
    /** The count of owners the filters keep, by the search. */
    count: ({ count }: { count: number }) => `Space owners: ${String(count)}`,
    empty: 'No space owners yet',
    emptyHint: 'Add an owner and link their space to verify it.',
    noMatch: 'No space owners match',
    clearFilters: 'Clear filters',
    loadFailed: 'We couldn’t load the space owners',
    pagination: {
      label: 'Pages of the space owners list',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      /** Where the list is, on a phone. */
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
  /** The space and person searches shared by the add-owner sheet and the link dialog. */
  choices: {
    search: 'Search',
    spacesPlaceholder: 'Space name',
    spaces: 'Spaces',
    peoplePlaceholder: 'Name or email',
    people: 'People',
    noResults: 'No results',
    searching: 'Searching…',
    searchFailed: 'We couldn’t search; type again to retry.',
    /** A space already the person's, offered but not to be chosen. */
    linked: 'Linked',
    /** What a person offered is: an owner with their spaces, an owner, or a user. */
    owner: ({ spaces }: { spaces: string }) => `Owner · ${spaces}`,
    ownerOfNone: 'Owner',
    user: 'User',
  },
  /** Adding an owner from the owners page. */
  addOwner: {
    open: 'Add owner',
    title: 'Add owner',
    description: 'Linked to one space; link more afterwards.',
    close: 'Close',
    name: 'Name',
    email: 'Email address',
    emailPlaceholder: 'name@example.com',
    space: 'Space',
    chooseSpace: 'Choose the space',
    willCreate:
      'An account will be created and a temporary password shown once — have a way to hand it over ready.',
    hasAccount: 'This email has an account',
    checkingAccount: 'Checking whose account this is…',
    account: { name: 'Name', joined: 'Joined', spaces: 'Spaces', noSpaces: 'None' },
    confirmAccount: 'Make sure this is the person you mean: they’ll become an owner of this space',
    accountUnconfirmed:
      'We couldn’t show whose account this is, so it can’t be upgraded here — check the email.',
    willUpgrade:
      'Their account will be upgraded to owner and linked to the space; it keeps its name and its way of signing in, and no password is shown.',
    create: 'Create account and link',
    upgrade: 'Upgrade and link',
    failed: 'The owner wasn’t added',
    fieldErrors: {
      name: { required: 'Enter the name' },
      email: {
        required: 'Enter the email',
        invalid_format: 'Enter a valid email, e.g. name@example.com',
      },
      spaceId: {
        required: 'Choose the space',
        invalid_choice: 'That space is no longer available — choose another',
      },
    },
    refusals: {
      ACCOUNT_IS_ADMIN:
        'This email is an admin’s account, and an admin can’t be linked to a space.',
      ACCOUNT_SUSPENDED: 'This account is suspended; it can’t be linked until it’s restored.',
      ALREADY_OWNER:
        'This email is already an owner’s — link them to the space from their row in the list.',
    },
    upgraded: ({ name, space }: { name: string; space: string }) =>
      `${name} upgraded to owner and linked to ${space}`,
  },
  /** Linking an owner, from a space's editor or from an owner's row. */
  link: {
    titleFromSpace: ({ space }: { space: string }) => `Link an owner to ${space}`,
    titleFromPerson: ({ name }: { name: string }) => `Link ${name} to a space`,
    close: 'Close',
    /** From a space, which is linked from its editor only while it has no owner. */
    noOwner: 'It has no owner today.',
    oneAtATime: 'One space at a time.',
    person: 'Person',
    personHelper: 'Owners and users, by name or email. Suspended accounts can’t be linked.',
    choosePerson: 'Choose a person',
    space: 'Space',
    chooseSpace: 'Choose a space',
    /** What the link does, said before it is made. */
    becomesVerified: ({ space }: { space: string }) =>
      `${space} becomes verified and its owner edits it; the Masaha team no longer does.`,
    anotherOwner: ({ space }: { space: string }) =>
      `They become another owner of ${space}; it stays verified.`,
    becomesOwner: 'Their account becomes an owner’s, and they’re asked to sign in again.',
    addOwner: 'A new owner with no account? Add them on the space owners page.',
    submit: 'Link',
    failed: 'Not linked',
    refusals: {
      RECEPTION_LINK_ACTIVE:
        'This person has a reception link at this space; its owner ends it first.',
      ACCOUNT_IS_ADMIN: 'This is an admin’s account; an admin can’t be linked to a space.',
      ACCOUNT_SUSPENDED: 'This account is suspended; it can’t be linked until it’s restored.',
      ACCOUNT_PASSWORD_PENDING:
        'This person hasn’t changed their temporary password yet; they can’t be linked until they sign in and change it.',
      validation: 'That account no longer exists.',
      not_found: 'The space was deleted meanwhile.',
    },
    linked: ({ person, space }: { person: string; space: string }) =>
      `${person} linked to ${space}`,
    nowVerified: 'The space is now verified',
  },
  /** Unlinking an owner from a space, which asks first. */
  unlink: {
    title: ({ person, space }: { person: string; space: string }) =>
      `Unlink ${person} from ${space}?`,
    /** What the unlink does, from the space's owners as the server reads them. */
    lastOwner: ({ space }: { space: string }) =>
      `${space} becomes unverified, its live status disappears, and the Masaha team edits it.`,
    othersStay: 'The other owners stay, and it stays verified.',
    /** When the space's owners could not be read. */
    ifLast: 'If they are its only owner, it becomes unverified and its live status disappears.',
    confirm: 'Unlink',
    cancel: 'Back',
    failed: 'Not unlinked',
    refusals: {
      not_found: 'The space was deleted meanwhile.',
    },
    unlinked: ({ person, space }: { person: string; space: string }) =>
      `${person} unlinked from ${space}`,
    nowUnverified: 'The space is now unverified',
  },
  /** A space's owners' actions in its editor: an unlink per owner, or the link while it has none. */
  spaceOwners: {
    unlink: ({ name }: { name: string }) => `Unlink ${name}`,
    link: 'Link an owner',
    /** Why the link waits while the editor has unsaved changes, which the link would drop. */
    unsavedReason: 'Save or discard your changes first',
  },
  /** An owner's row actions on the owners page. */
  ownerActions: {
    menu: ({ name }: { name: string }) => `Actions: ${name}`,
    link: 'Link to a space',
    suspended: 'The account is suspended — restore it first',
    unlinkFrom: ({ space }: { space: string }) => `Unlink from ${space}`,
  },
} as const;
