/** A space's life on the platform, as the admin keeps it: hide, show, delete and undo. */
export const SPACES = {
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
