/** The interface languages (docs/frontend/localisation.md). */
export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
