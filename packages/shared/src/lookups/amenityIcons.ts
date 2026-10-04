// The icon keys an amenity may carry (docs/architecture/data-model.md › Amenity). Each is a Lucide
// glyph name; the web will map each key to the design system's icon of that glyph in build step 2
// (docs/architecture/findings.md, finding 10).
export const AMENITY_ICON_KEYS = [
  'wifi',
  'zap',
  'sun',
  'plug-zap',
  'coffee',
  'users',
  'presentation',
  'graduation-cap',
] as const;

export type AmenityIconKey = (typeof AMENITY_ICON_KEYS)[number];
