import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

// Physical direction utilities break RTL, so each must be written in its logical form
// (docs/frontend/design-system/foundation.md §8): ml/mr → ms/me, pl/pr → ps/pe, left/right → start/end,
// text-left/right → text-start/end, border-l/r → border-s/e, rounded-l/r/tl/tr/bl/br →
// rounded-s/e/ss/se/es/ee, scroll-ml/mr/pl/pr → scroll-ms/me/ps/pe, float/clear-left/right → -start/end.
// Utilities with no logical form in Tailwind (origin-*, bg-left, translate-x-*) are not flagged:
// there would be nothing to replace them with.
const PHYSICAL_UTILITIES = [
  // A spacing or inset value starts with a digit, px, auto, full, or an arbitrary [..] / (..) value.
  String.raw`-?(?:scroll-)?[mp][lr]-(?:\d|px|auto|\[|\()`,
  String.raw`-?(?:left|right)-(?:\d|px|auto|full|\[|\()`,
  String.raw`(?:text|float|clear)-(?:left|right)(?![\w-])`,
  String.raw`border-[lr](?![a-z])`,
  String.raw`rounded-[tb]?[lr](?![a-z])`,
];

// A class starts after a separator (whitespace, a quote, a variant's colon, an important `!`), never
// inside a longer word or path, so `html-`, `margin-left` and `./left-1` are not classes.
const PHYSICAL_CLASS = new RegExp(
  String.raw`(?<![\w/-])(?:${PHYSICAL_UTILITIES.join('|')})[^\s'"\x60;,{}<>]*`,
  'g',
);

// An arbitrary value bypasses the tokens (foundation §2), so outside the design-system layer no
// utility may carry one: text-[13px], bg-[#fff], bg-(--spark-500), a /[..] modifier, or an arbitrary
// property such as [mask-type:alpha]. Arbitrary variants (data-[state=open]:) only choose when a
// utility applies, so they stay allowed. The layer itself binds its tokens this way.
const ARBITRARY_UTILITY = /^!?(?:-?[a-z][\w-]*?[-/][[(]|\[[\w-]+:)/;
const CLASS_TOKEN = /[^\s'"\x60{};]+/g;
const LAYER = 'src/shared/design-system/';

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

export type ClassHit = { line: number; column: number; className: string };

function findClasses(source: string, pattern: RegExp, matches: (token: string) => boolean) {
  return source.split('\n').flatMap((text, index) =>
    Array.from(text.matchAll(pattern))
      .filter((match) => matches(match[0]))
      .map((match) => ({ line: index + 1, column: match.index + 1, className: match[0] })),
  );
}

export function findPhysicalClasses(source: string): ClassHit[] {
  return findClasses(source, PHYSICAL_CLASS, () => true);
}

// Variants end at a colon outside brackets and parentheses; the utility is what follows the last.
function splitVariants(token: string): { variants: string[]; utility: string } {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];
    if (character === '[' || character === '(') {
      depth += 1;
    } else if (character === ']' || character === ')') {
      depth -= 1;
    } else if (character === ':' && depth === 0) {
      variants.push(token.slice(start, index));
      start = index + 1;
    }
  }
  return { variants, utility: token.slice(start) };
}

export function findArbitraryValueClasses(source: string): ClassHit[] {
  return findClasses(source, CLASS_TOKEN, (token) =>
    ARBITRARY_UTILITY.test(splitVariants(token).utility),
  );
}

// The selected tint (foundation §5) marks what is chosen, so it is never a hover or a highlight: a
// copied component's hover:bg-accent would bring the old meaning back unseen. A hover takes the
// `hover` role, or `hover-on-muted` on a muted ground. A hover or highlight variant counts anywhere
// in a class's stack (md:hover:, not-data-active:hover:), on another element (group-hover:,
// peer-hover/menu-button:), and with an opacity or an important mark. The layer is checked too.
const SELECTED_TINT = new Set([
  'bg-accent',
  'text-accent-foreground',
  'bg-sidebar-accent',
  'text-sidebar-accent-foreground',
]);
const HOVER_OR_HIGHLIGHT = new Set([
  'hover',
  'active',
  'focus',
  'focus-visible',
  'aria-expanded',
  'data-open',
  'has-data-open',
  'data-[selected=true]',
  'data-highlighted',
]);

// The same states under their arbitrary spellings, as older copied components write them. Not
// aria-selected: react-day-picker marks a chosen day with it.
const SPELLINGS: Record<string, string> = {
  'data-[state=open]': 'data-open',
  'aria-[expanded=true]': 'aria-expanded',
  'data-[highlighted]': 'data-highlighted',
  'data-[highlighted=true]': 'data-highlighted',
};

// A group- or peer- variant, and its /name, is the same state read on another element.
const hoversOrHighlights = (variant: string) => {
  const state = variant.replace(/\/[\w-]+$/, '').replace(/^(?:group|peer)-/, '');
  return HOVER_OR_HIGHLIGHT.has(SPELLINGS[state] ?? state);
};

// The utility's name, without its important mark or opacity modifier.
const utilityName = (utility: string) => utility.replace(/^!|!$/g, '').replace(/\/.*$/, '');

export function findSelectedTintHoverClasses(source: string): ClassHit[] {
  return findClasses(source, CLASS_TOKEN, (token) => {
    const { variants, utility } = splitVariants(token);
    return SELECTED_TINT.has(utilityName(utility)) && variants.some(hoversOrHighlights);
  });
}

function main() {
  const webRoot = join(import.meta.dirname, '..');
  const files = readdirSync(join(webRoot, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((file) => SCANNED_EXTENSIONS.has(extname(file)))
    .map((file) => join('src', file).replaceAll('\\', '/'));

  const report = (file: string, hits: ClassHit[]) => {
    for (const hit of hits) {
      console.error(`${file}:${String(hit.line)}:${String(hit.column)}  ${hit.className}`);
    }
    return hits.length;
  };

  let physical = 0;
  let arbitrary = 0;
  let tintHovers = 0;
  for (const file of files) {
    const source = readFileSync(join(webRoot, file), 'utf8');
    physical += report(file, findPhysicalClasses(source));
    if (!file.startsWith(LAYER)) {
      arbitrary += report(file, findArbitraryValueClasses(source));
    }
    tintHovers += report(file, findSelectedTintHoverClasses(source));
  }

  if (physical > 0) {
    console.error(
      `\n${String(physical)} physical direction class(es). Use the logical form instead.`,
    );
  }
  if (arbitrary > 0) {
    console.error(
      `\n${String(arbitrary)} arbitrary-value class(es) outside ${LAYER}. Use a token instead.`,
    );
  }
  if (tintHovers > 0) {
    console.error(
      `\n${String(tintHovers)} class(es) show the selected tint as a hover or highlight. Use hover (hover-on-muted on a muted ground) instead.`,
    );
  }
  if (physical > 0 || arbitrary > 0 || tintHovers > 0) {
    process.exitCode = 1;
  } else {
    console.log(
      `No physical direction, arbitrary-value or selected-tint hover classes in ${String(files.length)} files.`,
    );
  }
}

if (import.meta.main) {
  main();
}
