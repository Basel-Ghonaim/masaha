/** The user's links to spaces, in the dashboard: the space switcher. */
export const SPACE_LINKS = {
  /** The switcher's name, with the space it shows. */
  switchSpace: ({ name }: { name: string }) => `Switch space: ${name}`,
  /** The switcher's list. */
  yourSpaces: 'Your spaces',
  /** The switcher, when the space in the address is none of the user's. */
  chooseSpace: 'Choose a space',
  loadFailed: 'Couldn’t load your spaces',
} as const;
