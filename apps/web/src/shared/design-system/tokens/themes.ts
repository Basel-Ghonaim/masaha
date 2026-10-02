/**
 * The themes the layer defines, each a complete resolution of the semantic tokens in semantic.css
 * (docs/frontend/design-system/foundation.md §6). semantic.unit.test.ts holds this list to the
 * token file, so a theme is added in both places or the test fails.
 */
export const THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];
