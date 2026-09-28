import { describe, expect, it } from 'vitest';
import primitivesCss from './primitives.css?raw';
import semanticCss from './semantic.css?raw';

// Every role in docs/frontend/design-system/foundation.md §5, and the tokens semantic.css resolves
// per theme besides them.
const ROLES = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'muted',
  'muted-foreground',
  'border',
  'input',
  'ring',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'destructive-subtle',
  'destructive-subtle-foreground',
  'success',
  'success-foreground',
  'success-subtle',
  'success-subtle-foreground',
  'warning',
  'warning-foreground',
  'warning-subtle',
  'warning-subtle-foreground',
  'info',
  'info-foreground',
  'info-subtle',
  'info-subtle-foreground',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
];
const THEMED_TOKENS = [
  'elevation-raised',
  'elevation-floating',
  'elevation-overlay',
  'card-border',
  'overlay-scrim',
];

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];
type Pair = { text: string; surface: string; minimum: number };

// The pairs foundation §5 lists under *Verified*. A pair it names twice (muted-foreground on muted;
// destructive, success and info as text and as fills) is checked once, at the text threshold,
// because the text pairs are listed first.
const TEXT = 4.5;
const NON_TEXT = 3;
const STATUS_FILLS = ['success', 'warning', 'info', 'destructive'];
const VERIFIED_PAIRS: Pair[] = [
  { text: 'foreground', surface: 'background', minimum: TEXT },
  ...ROLES.filter((role) => role.endsWith('-foreground')).map((role) => ({
    text: role,
    surface: role.slice(0, -'-foreground'.length),
    minimum: TEXT,
  })),
  ...['muted-foreground', 'primary', 'destructive', 'success', 'info'].flatMap((text) =>
    ['background', 'card', 'muted'].map((surface) => ({ text, surface, minimum: TEXT })),
  ),
  // Table rows take the accent when hovered or when their menu is open, with their text unchanged.
  ...['foreground', 'muted-foreground'].map((text) => ({ text, surface: 'accent', minimum: TEXT })),
  ...[
    'input',
    'ring',
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
    ...STATUS_FILLS,
  ].flatMap((text) =>
    ['background', 'card'].map((surface) => ({ text, surface, minimum: NON_TEXT })),
  ),
].filter(
  (pair, index, pairs) =>
    pairs.findIndex(({ text, surface }) => text === pair.text && surface === pair.surface) ===
    index,
);

/** The custom properties of the top-level rule with this exact selector (at-rule blocks skipped). */
function customProperties(css: string, selector: string): Map<string, string> {
  const topLevel = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@[^{;]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const rule = Array.from(topLevel.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find(
    ([, ruleSelector]) => ruleSelector?.trim() === selector,
  );
  if (!rule?.[2]) {
    throw new Error(`No ${selector} rule`);
  }
  return new Map(
    Array.from(rule[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g), ([, name = '', value = '']) => [
      name,
      value.trim(),
    ]),
  );
}

const primitives = customProperties(primitivesCss, ':root');
const themes = {
  light: customProperties(semanticCss, "[data-theme='light']"),
  dark: customProperties(semanticCss, "[data-theme='dark']"),
};

/** Follows var() references through the theme and the primitives to a hex colour. */
function resolveColour(theme: Theme, token: string): string {
  const value = themes[theme].get(token) ?? primitives.get(token);
  const reference = value?.match(/^var\(--([\w-]+)\)$/)?.[1];
  if (reference) {
    return resolveColour(theme, reference);
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`--${token} (${theme}) does not resolve to a hex colour: ${String(value)}`);
  }
  return value;
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const [a, b] = [luminance(first), luminance(second)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('theme key parity', () => {
  it('gives both themes exactly the same keys', () => {
    expect([...themes.dark.keys()].sort()).toEqual([...themes.light.keys()].sort());
  });

  it.each(THEMES)('resolves every role and themed token in the %s theme', (theme) => {
    const missing = [...ROLES, ...THEMED_TOKENS].filter((key) => !themes[theme].has(key));
    expect(missing).toEqual([]);
  });
});

describe('contrast', () => {
  it('measures contrast as WCAG defines it', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it.each(
    THEMES.flatMap((theme) =>
      VERIFIED_PAIRS.map(({ text, surface, minimum }) => ({ theme, text, surface, minimum })),
    ),
  )('$theme: $text on $surface meets $minimum:1', ({ theme, text, surface, minimum }) => {
    const ratio = contrastRatio(resolveColour(theme, text), resolveColour(theme, surface));
    expect(ratio).toBeGreaterThanOrEqual(minimum);
  });
});
