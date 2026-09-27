import { describe, expect, it } from 'vitest';
import tailwindCss from '../tokens/tailwind.css?raw';
import { cn } from './cn';

// Read from tailwind.css, so a text style or shadow added there without teaching cn fails here.
const namesIn = (namespace: string) =>
  Array.from(
    tailwindCss.matchAll(new RegExp(String.raw`--${namespace}-([a-z0-9]+(?:-[a-z0-9]+)*):`, 'g')),
  ).flatMap((match) => match[1] ?? []);

const TEXT_STYLES = namesIn('text');
const SHADOWS = namesIn('shadow');

describe('cn', () => {
  it('joins conditional classes', () => {
    expect(cn('flex', { hidden: false }, undefined, ['gap-4'])).toBe('flex gap-4');
  });

  it('finds the text styles and shadows in tailwind.css', () => {
    expect(TEXT_STYLES).toContain('body');
    expect(SHADOWS).toContain('raised');
  });

  it.each(TEXT_STYLES)('keeps text-%s next to a text colour', (style) => {
    expect(cn(`text-${style}`, 'text-primary')).toBe(`text-${style} text-primary`);
  });

  it.each(TEXT_STYLES)('lets a later text style replace text-%s', (style) => {
    expect(cn('text-caption', `text-${style}`)).toBe(`text-${style}`);
  });

  it.each(SHADOWS)('lets a later shadow replace shadow-%s', (shadow) => {
    expect(cn(`shadow-${shadow}`, 'shadow-none')).toBe('shadow-none');
  });
});
