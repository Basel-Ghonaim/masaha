// The icon keys an amenity may carry (docs/architecture/data-model.md › Amenity). Each is a glyph's
// name that the web's design system draws (`GlyphIcon`); the web's typecheck refuses a key it cannot
// draw (docs/features/lookups.md).
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
