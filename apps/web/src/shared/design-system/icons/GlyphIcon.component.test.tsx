import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DirectionProvider } from '../lib/DirectionProvider';
import { GlyphIcon, type GlyphName } from '.';

// Each name, with the class the icon library gives the glyph it draws.
const GLYPHS: { name: GlyphName; glyph: string }[] = [
  { name: 'wifi', glyph: 'lucide-wifi' },
  { name: 'zap', glyph: 'lucide-zap' },
  { name: 'sun', glyph: 'lucide-sun' },
  { name: 'plug-zap', glyph: 'lucide-plug-zap' },
  { name: 'coffee', glyph: 'lucide-coffee' },
  { name: 'users', glyph: 'lucide-users' },
  { name: 'presentation', glyph: 'lucide-presentation' },
  { name: 'graduation-cap', glyph: 'lucide-graduation-cap' },
];

function svgOf(name: GlyphName) {
  const { container } = render(
    <DirectionProvider dir="rtl">
      <GlyphIcon name={name} className="size-5" />
    </DirectionProvider>,
  );
  return container.querySelector('svg');
}

describe('GlyphIcon', () => {
  it.each(GLYPHS)(
    'draws $name as its glyph, never mirrored, with the classes it is given',
    ({ name, glyph }) => {
      const svg = svgOf(name);

      expect(svg).toHaveClass(glyph, 'size-5');
      expect(svg).not.toHaveClass('-scale-x-100');
    },
  );
});
