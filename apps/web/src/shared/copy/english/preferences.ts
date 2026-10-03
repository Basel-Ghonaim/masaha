import type { Theme } from '@shared/design-system';

/** The language and theme toggles, in every shell. */
export const PREFERENCES = {
  /** This language's name in its own words: the language toggle offers it from the other language. */
  languageName: 'English',
  /** What the theme toggle does, by the theme shown: it switches to the other one. */
  switchTheme: {
    light: 'Dark theme',
    dark: 'Light theme',
  } satisfies Record<Theme, string>,
} as const;
