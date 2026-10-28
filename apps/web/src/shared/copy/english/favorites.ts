/** A signed-in user's favourites on the site: the heart on the cards and on a space's page. */
export const FAVORITES = {
  /** The heart's name, by whether the space is saved. */
  save: ({ name }: { name: string }) => `Save ${name} to favourites`,
  remove: ({ name }: { name: string }) => `Remove ${name} from favourites`,
  /** The toasts, the space named under them, with «تراجع». */
  added: 'Added to favourites',
  removed: 'Removed from favourites',
  undo: 'Undo',
  saveFailed: ({ name }: { name: string }) => `We couldn’t save ${name} to your favourites`,
  removeFailed: ({ name }: { name: string }) => `We couldn’t remove ${name} from your favourites`,
  /** A guest's heart, saved once they are back signed in. */
  savedOnReturn: ({ name }: { name: string }) => `${name} saved to your favourites`,
  gone: 'This space is no longer in the directory.',
  /** The full list's way to the favourites. */
  manage: 'Manage favourites',
} as const;
