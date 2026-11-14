import { GlyphIcon } from '@shared/design-system';
import { knownAmenityIcon } from '@shared/lib';

/**
 * An amenity's icon, beside the words that name it. A key the running bundle does not know draws
 * nothing, so an amenity added by a newer migration still renders in the code before it.
 */
export function AmenityIcon({ icon }: { icon: string }) {
  const name = knownAmenityIcon(icon);
  return name === null ? null : <GlyphIcon name={name} aria-hidden />;
}
