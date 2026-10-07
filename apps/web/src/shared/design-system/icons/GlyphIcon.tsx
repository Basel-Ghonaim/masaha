import type { ComponentType } from 'react';
import type { IconProps } from './Icon';
import {
  CoffeeIcon,
  GraduationCapIcon,
  PlugZapIcon,
  PresentationIcon,
  SunIcon,
  UsersIcon,
  WifiIcon,
  ZapIcon,
} from './iconSet';

// The glyphs data may name, each pointing at its icon declared in the set, so an icon is still
// declared once. None is directional, so none mirrors.
const GLYPHS = {
  wifi: WifiIcon,
  zap: ZapIcon,
  sun: SunIcon,
  'plug-zap': PlugZapIcon,
  coffee: CoffeeIcon,
  users: UsersIcon,
  presentation: PresentationIcon,
  'graduation-cap': GraduationCapIcon,
} satisfies Record<string, ComponentType<IconProps>>;

/** The names `GlyphIcon` draws: a closed set, so a name it lacks fails the typecheck. */
export type GlyphName = keyof typeof GLYPHS;

/**
 * An icon chosen by its glyph's name, for data that names its own icon, such as a record that stores
 * the name. The layer knows the names, not what holds them.
 */
export function GlyphIcon({ name, ...props }: IconProps & { name: GlyphName }) {
  const Glyph = GLYPHS[name];
  return <Glyph {...props} />;
}
