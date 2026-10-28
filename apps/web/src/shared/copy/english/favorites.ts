import { englishPlural } from '../plural';

/**
 * A signed-in user's favourites on the site: the heart on the cards and on a space's page, and the
 * account's «المفضّلة».
 */
export const FAVORITES = {
  /** The heart's name, by whether the space is saved. */
  save: ({ name }: { name: string }) => `Save ${name} to favourites`,
  remove: ({ name }: { name: string }) => `Remove ${name} from favourites`,
  /** The toasts, the space named under them, with «تراجع». */
  added: 'Added to favourites',
  removed: 'Removed from favourites',
  /** «إزالة» of a space that left the directory: no undo, since it cannot be saved meanwhile. */
  removedLeft: ({ name }: { name: string }) =>
    `${name} removed from favourites. It can’t be saved again while it’s out of the directory.`,
  undo: 'Undo',
  saveFailed: ({ name }: { name: string }) => `We couldn’t save ${name} to your favourites`,
  removeFailed: ({ name }: { name: string }) => `We couldn’t remove ${name} from your favourites`,
  /** A guest's heart, saved once they are back signed in. */
  savedOnReturn: ({ name }: { name: string }) => `${name} saved to your favourites`,
  gone: 'This space is no longer in the directory.',
  /** The full list's way to the favourites. */
  manage: 'Manage favourites',
  /** The account's «المفضّلة» (screen 10). */
  list: {
    title: 'Favourites',
    description: 'The spaces you saved, with their status now.',
    count: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: `${String(count)} saved space`,
        other: `${String(count)} saved spaces`,
      }),
    /** A space that left the directory (C7). */
    gone: 'This space is no longer listed in the directory',
    remove: 'Remove',
    empty: {
      title: 'You haven’t saved any spaces yet',
      text: 'Tap the heart on any space’s page to find it here.',
    },
    loadFailed: 'We couldn’t load your favourites',
    region: 'Saved spaces',
  },
} as const;
