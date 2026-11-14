import { AMENITY_ICON_KEYS } from '@masaha/shared/lookups';
import type { GlyphName } from '@shared/design-system';

/**
 * The icon key the web draws for an amenity, or null when it is not one the running bundle knows.
 * An unknown key (a retired name, or a key added after this bundle) falls back to none, so the row
 * or checklist still renders: a newer migration must work with the code before it.
 */
export function knownAmenityIcon(key: string | null | undefined): GlyphName | null {
  if (key == null) return null;
  return (AMENITY_ICON_KEYS as readonly string[]).includes(key) ? (key as GlyphName) : null;
}
