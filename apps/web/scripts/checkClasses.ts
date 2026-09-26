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

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

export type PhysicalClass = { line: number; column: number; className: string };

export function findPhysicalClasses(source: string): PhysicalClass[] {
  return source.split('\n').flatMap((text, index) =>
    Array.from(text.matchAll(PHYSICAL_CLASS), (match) => ({
      line: index + 1,
      column: match.index + 1,
      className: match[0],
    })),
  );
}

function main() {
  const webRoot = join(import.meta.dirname, '..');
  const files = readdirSync(join(webRoot, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((file) => SCANNED_EXTENSIONS.has(extname(file)))
    .map((file) => join('src', file).replaceAll('\\', '/'));

  let found = 0;
  for (const file of files) {
    for (const hit of findPhysicalClasses(readFileSync(join(webRoot, file), 'utf8'))) {
      console.error(`${file}:${String(hit.line)}:${String(hit.column)}  ${hit.className}`);
      found += 1;
    }
  }

  if (found > 0) {
    console.error(`\n${String(found)} physical direction class(es). Use the logical form instead.`);
    process.exitCode = 1;
  } else {
    console.log(`No physical direction classes in ${String(files.length)} files.`);
  }
}

if (import.meta.main) {
  main();
}
