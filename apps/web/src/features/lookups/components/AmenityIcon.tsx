import type { AmenityIconKey } from '@masaha/shared/lookups';
import { GlyphIcon } from '@shared/design-system';

/**
 * An amenity's icon, beside the words that name it. Each icon key is a glyph's name, and handing it to
 * `GlyphIcon` checks that at compile time: a key the design system cannot draw fails the typecheck.
 */
export function AmenityIcon({ icon }: { icon: AmenityIconKey }) {
  return <GlyphIcon name={icon} aria-hidden />;
}
