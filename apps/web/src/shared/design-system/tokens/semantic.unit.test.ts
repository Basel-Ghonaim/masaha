import { describe, expect, it } from 'vitest';
import primitivesCss from './primitives.css?raw';
import semanticCss from './semantic.css?raw';
import tailwindCss from './tailwind.css?raw';
import { THEMES, type Theme } from './themes';

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
  'primary-hover',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'hover',
  'hover-foreground',
  'hover-on-muted',
  'spark',
  'scrim',
  'scrim-foreground',
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
  'skeleton',
];
// The roles and themed tokens that are colours (the elevations are shadows).
const COLOUR_TOKENS = [...ROLES, 'card-border', 'overlay-scrim', 'skeleton'];

// A translucent colour is only ever drawn over a ground, so it is measured composited over that
// ground: the wash over the muted track, the scrim over a photo's lightest and darkest pixel, the
// overlay's scrim over the page.
const GROUNDS: Record<string, string[]> = {
  'hover-on-muted': ['muted'],
  scrim: ['#ffffff', '#000000'],
  'overlay-scrim': ['background'],
};

const PALETTE_RAMPS = ['neutral', 'spark', 'green', 'amber', 'red', 'blue'];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

type Pair = { text: string; surface: string; over?: string; minimum: number };

// The pairs foundation §5 lists under *Verified*. A pair named twice (muted-foreground on muted;
// destructive, success and info as text and as fills) is checked once, at the text threshold,
// because the text pairs are listed first.
const TEXT = 4.5;
const NON_TEXT = 3;
const STATUS_FILLS = ['success', 'warning', 'info', 'destructive'];
const TEXT_PAIRS: Pair[] = [
  { text: 'foreground', surface: 'background', minimum: TEXT },
  // Every -foreground on its surface; the scrim's is measured over a photo, below.
  ...ROLES.filter((role) => role.endsWith('-foreground') && role !== 'scrim-foreground').map(
    (role) => ({ text: role, surface: role.slice(0, -'-foreground'.length), minimum: TEXT }),
  ),
  ...['muted-foreground', 'primary', 'destructive', 'success', 'info'].flatMap((text) =>
    ['background', 'card', 'muted'].map((surface) => ({ text, surface, minimum: TEXT })),
  ),
  // A selected item (the tint) and a hovered one keep the text they had.
  ...['foreground', 'muted-foreground'].flatMap((text) =>
    ['accent', 'sidebar-accent'].map((surface) => ({ text, surface, minimum: TEXT })),
  ),
  ...['muted-foreground', 'sidebar-foreground'].map((text) => ({
    text,
    surface: 'hover',
    minimum: TEXT,
  })),
  // A state takes its surface's text: the ink's label on its hover, a control's over the wash.
  { text: 'primary-foreground', surface: 'primary-hover', minimum: TEXT },
  { text: 'foreground', surface: 'hover-on-muted', over: 'muted', minimum: TEXT },
  ...(GROUNDS.scrim ?? []).map((photo) => ({
    text: 'scrim-foreground',
    surface: 'scrim',
    over: photo,
    minimum: TEXT,
  })),
];
const NON_TEXT_PAIRS: Pair[] = [
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
  // The spark is a fill, an edge or a mark on each ground it sits on, the selected tint included.
  ...['background', 'card', 'popover', 'sidebar', 'accent', 'sidebar-accent'].map((surface) => ({
    text: 'spark',
    surface,
    minimum: NON_TEXT,
  })),
  // The focus ring on the fills a focused item can carry.
  ...['muted', 'accent', 'hover', 'sidebar-accent'].map((surface) => ({
    text: 'ring',
    surface,
    minimum: NON_TEXT,
  })),
];
const VERIFIED_PAIRS = [...TEXT_PAIRS, ...NON_TEXT_PAIRS].filter(
  (pair, index, pairs) =>
    pairs.findIndex(
      ({ text, surface, over }) =>
        text === pair.text && surface === pair.surface && over === pair.over,
    ) === index,
);

// A fill is seen when it stands apart from its ground (ADR 0019's criteria): a hover-type fill at
// 1.2:1, the selected tint at 1.15:1 (its second mark or its word carries the rest).
const SEEN = 1.2;
const SELECTED_SEEN = 1.15;
const FILLS = [
  ...['card', 'background', 'popover', 'sidebar'].map((ground) => ({
    fill: 'hover',
    ground,
    minimum: SEEN,
  })),
  { fill: 'hover-on-muted', ground: 'muted', minimum: SEEN },
  ...['card', 'background'].map((ground) => ({ fill: 'skeleton', ground, minimum: SEEN })),
  { fill: 'accent', ground: 'card', minimum: SELECTED_SEEN },
  { fill: 'sidebar-accent', ground: 'sidebar', minimum: SELECTED_SEEN },
];

// OKLab distances: a just-noticeable difference, and the distance at which a colour no longer
// reads as the destructive red (lower under colour blindness, where every distance shrinks).
const NOTICEABLE = 0.02;
const APART = 0.1;
const APART_CVD = 0.08;

// The identity's colours as the logo files, the favicon and theme-color write them by hand.
const IDENTITY: Record<Theme, Record<string, string>> = {
  light: { background: '#f7fbff', foreground: '#1a1f25', spark: '#b55bb3' },
  dark: { background: '#0d1217', foreground: '#f7fbff', spark: '#d27ed0' },
};

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
      value.replace(/\s+/g, ' ').trim(),
    ]),
  );
}

const primitives = customProperties(primitivesCss, ':root');
const themes = Object.fromEntries(
  THEMES.map((theme) => [theme, customProperties(semanticCss, `[data-theme='${theme}']`)]),
) as Record<Theme, Map<string, string>>;

// ── Colour maths. sRGB channels and alpha in 0–1; OKLab and OKLCH as Björn Ottosson defines them
// (the CSS Color 4 spaces); color-mix as CSS Color 5 defines it, interpolating premultiplied.

type Colour = { red: number; green: number; blue: number; alpha: number };
type Vector = [number, number, number];

const TRANSPARENT: Colour = { red: 0, green: 0, blue: 0, alpha: 0 };

function parseHex(hex: string): Colour {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  return { red, green, blue, alpha: 1 };
}

function toHex({ red, green, blue }: Colour): string {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const fromLinear = (channel: number) =>
  channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const linearOf = ({ red, green, blue }: Colour): Vector => [
  toLinear(red),
  toLinear(green),
  toLinear(blue),
];
const fromLinearVector = ([red, green, blue]: Vector, alpha = 1): Colour => ({
  red: clamp(fromLinear(red)),
  green: clamp(fromLinear(green)),
  blue: clamp(fromLinear(blue)),
  alpha,
});

const multiply = (matrix: Vector[], [x, y, z]: Vector): Vector =>
  matrix.map(([a, b, c]) => a * x + b * y + c * z) as Vector;

const LINEAR_TO_LMS: Vector[] = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const LMS_TO_OKLAB: Vector[] = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const OKLAB_TO_LMS: Vector[] = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
];
const LMS_TO_LINEAR: Vector[] = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

function toOklab(colour: Colour): Vector {
  const lms = multiply(LINEAR_TO_LMS, linearOf(colour)).map(Math.cbrt) as Vector;
  return multiply(LMS_TO_OKLAB, lms);
}

function fromOklab(lab: Vector, alpha: number): Colour {
  const lms = multiply(OKLAB_TO_LMS, lab).map((value) => value ** 3) as Vector;
  return fromLinearVector(multiply(LMS_TO_LINEAR, lms), alpha);
}

function toOklch(colour: Colour): Vector {
  const [lightness, a, b] = toOklab(colour);
  return [lightness, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** color-mix(in oklab, …) with weights already normalised to sum to 1. */
function mixColours(
  [first, firstWeight]: [Colour, number],
  [second, secondWeight]: [Colour, number],
): Colour {
  const alpha = first.alpha * firstWeight + second.alpha * secondWeight;
  if (alpha === 0) {
    return TRANSPARENT;
  }
  const [firstShare, secondShare] = [first.alpha * firstWeight, second.alpha * secondWeight];
  const blend = (a: number, b: number) => (a * firstShare + b * secondShare) / alpha;
  const [a, b] = [toOklab(first), toOklab(second)];
  return fromOklab([blend(a[0], b[0]), blend(a[1], b[1]), blend(a[2], b[2])], alpha);
}

/** Splits at the commas outside any parentheses. */
function topLevelArguments(text: string): string[] {
  const parts: string[] = [];
  let [depth, start] = [0, 0];
  Array.from(text).forEach((character, index) => {
    depth += character === '(' ? 1 : character === ')' ? -1 : 0;
    if (character === ',' && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  });
  return [...parts, text.slice(start)].map((part) => part.trim());
}

function resolveValue(theme: Theme, value: string): Colour {
  const reference = value.match(/^var\(--([\w-]+)\)$/)?.[1];
  if (reference) {
    return resolveToken(theme, reference);
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return parseHex(value);
  }
  if (value === 'transparent') {
    return TRANSPARENT;
  }
  const mix = value.match(/^color-mix\((.*)\)$/);
  if (mix?.[1]) {
    const [method = '', ...colours] = topLevelArguments(mix[1]);
    // Only OKLab is measured. In OKLCH Chrome treats a near-grey's hue as missing, so a mix of the
    // ink's neutrals paints with hue 0, a warm grey this model would not predict (EC3, 2026-11-12).
    if (method !== 'in oklab' || colours.length !== 2) {
      throw new Error(`Unsupported mix: ${value}`);
    }
    const [first, second] = colours.map((part) => {
      const percentage = part.match(/\s(\d+(?:\.\d+)?)%$/);
      return {
        colour: resolveValue(theme, percentage ? part.slice(0, percentage.index).trim() : part),
        percentage: percentage?.[1] === undefined ? undefined : Number(percentage[1]) / 100,
      };
    }) as [{ colour: Colour; percentage?: number }, { colour: Colour; percentage?: number }];
    // CSS Color 5's normalisation: a missing percentage is the rest of 100%; a sum under 100%
    // scales the result's alpha.
    const firstShare = first.percentage ?? 1 - (second.percentage ?? 0.5);
    const secondShare = second.percentage ?? 1 - firstShare;
    const sum = firstShare + secondShare;
    const result = mixColours([first.colour, firstShare / sum], [second.colour, secondShare / sum]);
    return { ...result, alpha: result.alpha * Math.min(1, sum) };
  }
  throw new Error(`Not a colour: ${value}`);
}

/** Follows var() and color-mix() through the theme and the primitives to a colour. */
function resolveToken(theme: Theme, token: string): Colour {
  const value = themes[theme].get(token) ?? primitives.get(token);
  if (value === undefined) {
    throw new Error(`--${token} (${theme}) is not defined`);
  }
  return resolveValue(theme, value);
}

/** The colour as the browser paints it: over its ground when translucent, 8 bits a channel. */
function painted(theme: Theme, token: string, over?: string): Colour {
  let colour = resolveToken(theme, token);
  if (colour.alpha < 1) {
    if (!over) {
      throw new Error(`--${token} (${theme}) is translucent and needs a ground`);
    }
    const ground = over.startsWith('#') ? parseHex(over) : painted(theme, over);
    const lay = (top: number, bottom: number) => top * colour.alpha + bottom * (1 - colour.alpha);
    colour = {
      red: lay(colour.red, ground.red),
      green: lay(colour.green, ground.green),
      blue: lay(colour.blue, ground.blue),
      alpha: 1,
    };
  }
  return parseHex(toHex(colour));
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(colour: Colour): number {
  const [red, green, blue] = linearOf(colour);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: Colour, second: Colour): number {
  const [a, b] = [luminance(first), luminance(second)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function deltaE(first: Colour, second: Colour): number {
  const [a, b] = [toOklab(first), toOklab(second)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// Machado, Oliveira and Fernandes (2009), severity 1.0, on linear RGB.
const PROTAN: Vector[] = [
  [0.152286, 1.052583, -0.204868],
  [0.114503, 0.786281, 0.099216],
  [-0.003882, -0.048116, 1.051998],
];
const DEUTAN: Vector[] = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.01182, 0.04294, 0.968881],
];
const VISIONS = { normal: undefined, protan: PROTAN, deutan: DEUTAN };

function seenBy(matrix: Vector[] | undefined, colour: Colour): Colour {
  if (!matrix) {
    return colour;
  }
  return fromLinearVector(multiply(matrix, linearOf(colour)).map(clamp) as Vector);
}

describe('the measures', () => {
  it('measures contrast as WCAG defines it', () => {
    expect(contrastRatio(parseHex('#000000'), parseHex('#ffffff'))).toBe(21);
    expect(contrastRatio(parseHex('#767676'), parseHex('#ffffff'))).toBeCloseTo(4.54, 2);
  });

  it('converts sRGB to OKLab as Ottosson defines it', () => {
    const [white, red] = [toOklab(parseHex('#ffffff')), toOklab(parseHex('#ff0000'))];
    white.forEach((value, index) => {
      expect(value).toBeCloseTo([1, 0, 0][index] ?? NaN, 3);
    });
    red.forEach((value, index) => {
      expect(value).toBeCloseTo([0.628, 0.225, 0.126][index] ?? NaN, 3);
    });
  });

  it('mixes in OKLab as CSS color-mix does', () => {
    expect(toHex(resolveValue('light', 'color-mix(in oklab, #ffffff, #000000)'))).toBe('#636363');
    const wash = resolveValue('light', 'color-mix(in oklab, #ff0000 40%, transparent)');
    expect([toHex(wash), wash.alpha]).toEqual(['#ff0000', 0.4]);
  });

  it('turns a chromatic OKLab mix back to sRGB as Chrome paints it: dark accent is #471f46', () => {
    // Chrome's painted pixel (the identity's visual pass, EC3), not computed by this code: it pins
    // the inverse's chroma terms, which a grey and a clamped red cannot.
    expect(toHex(painted('dark', 'accent'))).toBe('#471f46');
  });

  it('refuses a mix in OKLCH, where Chrome drops a near-grey’s hue', () => {
    expect(() => resolveValue('light', 'color-mix(in oklch, #1a1f25, #f7fbff 18%)')).toThrow(
      'Unsupported mix',
    );
  });

  it("simulates colour blindness with Machado's matrices, each row summing to 1", () => {
    for (const row of [...PROTAN, ...DEUTAN]) {
      expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    }
  });
});

describe('theme key parity', () => {
  it('defines a rule for exactly the themes the layer exports', () => {
    const defined = Array.from(
      semanticCss.matchAll(/\[data-theme='([^']+)'\]\s*\{/g),
      ([, theme]) => theme,
    );
    expect(defined.sort()).toEqual([...THEMES].sort());
  });

  it('gives every theme exactly the same keys', () => {
    const [first, ...others] = THEMES;
    for (const theme of others) {
      expect([...themes[theme].keys()].sort()).toEqual([...themes[first].keys()].sort());
    }
  });

  it.each(THEMES)('resolves every role and themed token in the %s theme', (theme) => {
    const missing = [...ROLES, ...THEMED_TOKENS].filter((key) => !themes[theme].has(key));
    expect(missing).toEqual([]);
  });

  it.each(THEMES)(
    'resolves every colour to a colour in the %s theme, a translucent one only with its ground',
    (theme) => {
      const translucent = COLOUR_TOKENS.filter((token) => resolveToken(theme, token).alpha < 1);
      expect(translucent.sort()).toEqual(Object.keys(GROUNDS).sort());
    },
  );
});

describe('the palette', () => {
  it("defines exactly the identity's ramps, eleven steps each, and white", () => {
    const colours = [...primitives]
      .filter(([, value]) => value.startsWith('#'))
      .map(([name]) => name);
    const expected = [
      ...PALETTE_RAMPS.flatMap((ramp) => STEPS.map((step) => `${ramp}-${String(step)}`)),
      'white',
    ];
    expect(colours.sort()).toEqual(expected.sort());
  });

  it.each(
    THEMES.flatMap((theme) =>
      Object.entries(IDENTITY[theme]).map(([token, hex]) => ({ theme, token, hex })),
    ),
  )("$theme: $token is the logo's $hex", ({ theme, token, hex }) => {
    expect(toHex(painted(theme, token))).toBe(hex);
  });
});

describe('contrast', () => {
  it.each(
    THEMES.flatMap((theme) =>
      VERIFIED_PAIRS.map((pair) => ({
        theme,
        ...pair,
        on: pair.over ? `${pair.surface} over ${pair.over}` : pair.surface,
      })),
    ),
  )('$theme: $text on $on meets $minimum:1', ({ theme, text, surface, over, minimum }) => {
    const ratio = contrastRatio(painted(theme, text), painted(theme, surface, over));
    expect(ratio).toBeGreaterThanOrEqual(minimum);
  });
});

describe('fills seen', () => {
  it.each(THEMES.flatMap((theme) => FILLS.map((fill) => ({ theme, ...fill }))))(
    '$theme: $fill stands apart from $ground at $minimum:1',
    ({ theme, fill, ground, minimum }) => {
      const ratio = contrastRatio(painted(theme, fill, ground), painted(theme, ground));
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    },
  );

  it.each(
    THEMES.flatMap((theme) =>
      ['accent', 'sidebar-accent'].map((selected) => ({ theme, selected })),
    ),
  )('$theme: hover is not the selected tint ($selected)', ({ theme, selected }) => {
    expect(deltaE(painted(theme, 'hover'), painted(theme, selected))).toBeGreaterThanOrEqual(
      NOTICEABLE,
    );
  });
});

describe('the brand never reads as an error', () => {
  it.each(
    THEMES.flatMap((theme) =>
      ['primary', 'spark'].flatMap((brand) =>
        Object.keys(VISIONS).map((vision) => ({ theme, brand, vision })),
      ),
    ),
  )('$theme: $brand is apart from destructive ($vision vision)', ({ theme, brand, vision }) => {
    const matrix = VISIONS[vision as keyof typeof VISIONS];
    const distance = deltaE(
      seenBy(matrix, painted(theme, brand)),
      seenBy(matrix, painted(theme, 'destructive')),
    );
    expect(distance).toBeGreaterThanOrEqual(matrix ? APART_CVD : APART);
  });

  it.each(['accent', 'sidebar-accent'])(
    'dark: the selected tint (%s) is apart from the destructive tint',
    (selected) => {
      expect(
        deltaE(painted('dark', selected), painted('dark', 'destructive-subtle')),
      ).toBeGreaterThanOrEqual(APART);
    },
  );

  it("dark: destructive's hue stays a red, 15–45°", () => {
    const [, , hue] = toOklch(painted('dark', 'destructive'));
    expect(hue).toBeGreaterThanOrEqual(15);
    expect(hue).toBeLessThanOrEqual(45);
  });
});

describe('the spark carries no text', () => {
  const css = tailwindCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const sparkUtilities = Array.from(
    css.matchAll(/@utility\s+([\w-]+)\s*\{([^{}]*)\}/g),
    ([, name = '', body = '']) => [name, body.replace(/\s+/g, ' ').trim()],
  ).filter(([, body]) => body?.includes('var(--spark)'));

  it('offers the spark only as a fill, an edge, an outline and a mark', () => {
    expect(Object.fromEntries(sparkUtilities)).toEqual({
      'bg-spark': 'background-color: var(--spark);',
      'border-spark': 'border-color: var(--spark);',
      'outline-spark': 'outline-color: var(--spark);',
      'fill-spark': 'fill: var(--spark);',
    });
  });

  it('gives the spark no theme colour, so no text-spark exists', () => {
    expect(css).not.toMatch(/--color-spark\b/);
    expect(css.match(/var\(--spark\)/g) ?? []).toHaveLength(sparkUtilities.length);
  });
});
