import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

// The design-system showcase is development-only (docs/frontend/architecture.md §2). If any of it
// reached the build, its route path or one of its fixture strings would be in dist/. Fixture
// strings are phrases, not single words, so they do not occur in unrelated code by chance. The
// copy catalogues are in the build by design, so a fixture string they also write proves nothing.
const SHOWCASE_PATH = '__showcase';
const FIXTURES = 'src/pages/showcase/fixtures.json';
const CATALOGUES = 'src/shared/copy';

// Text files only; fonts and images cannot carry module code.
const SCANNED_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.map']);

/** Every string in a value, however deeply nested. */
export function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
}

// A minifier may write non-ASCII characters as \uXXXX or \u{X...} escapes, so Arabic text is also
// looked for in the decoded source.
function decodeEscapes(source: string) {
  return source.replace(
    /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g,
    (_escape: string, braced: string | undefined, plain: string | undefined) =>
      String.fromCodePoint(Number.parseInt(braced ?? plain ?? '', 16)),
  );
}

/** The fixture strings only the showcase writes: those the catalogues' source does not contain. */
export function showcaseOnly(fixtureStrings: readonly string[], catalogueSource: string): string[] {
  return fixtureStrings.filter((text) => !catalogueSource.includes(text));
}

/** The catalogues' source files as one text, their tests left out. */
function readCatalogueSource(directory: string) {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => extname(file) === '.ts' && !file.endsWith('.test.ts'))
    .map((file) => readFileSync(join(directory, file), 'utf8'))
    .join('\n');
}

/** The forbidden strings that a build file contains. */
export function findForbidden(content: string, forbidden: readonly string[]): string[] {
  const decoded = decodeEscapes(content);
  return forbidden.filter((text) => content.includes(text) || decoded.includes(text));
}

function main() {
  const webRoot = join(import.meta.dirname, '..');
  const dist = join(webRoot, 'dist');
  if (!existsSync(dist)) {
    console.error('apps/web/dist does not exist. Run npm run build first.');
    process.exitCode = 1;
    return;
  }

  const fixtures: unknown = JSON.parse(readFileSync(join(webRoot, FIXTURES), 'utf8'));
  const catalogueSource = readCatalogueSource(join(webRoot, CATALOGUES));
  const forbidden = [SHOWCASE_PATH, ...showcaseOnly(stringsIn(fixtures), catalogueSource)];
  const files = readdirSync(dist, { recursive: true, encoding: 'utf8' }).filter((file) =>
    SCANNED_EXTENSIONS.has(extname(file)),
  );

  let hits = 0;
  for (const file of files) {
    for (const text of findForbidden(readFileSync(join(dist, file), 'utf8'), forbidden)) {
      console.error(`dist/${file.replaceAll('\\', '/')}  ${text}`);
      hits += 1;
    }
  }

  if (hits > 0) {
    console.error(
      `\n${String(hits)} showcase string(s) in the build. The showcase must stay development-only. If a fixture string only matches unrelated text, reword the fixture.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `No showcase code in ${String(files.length)} build files (${String(forbidden.length)} strings checked).`,
    );
  }
}

if (import.meta.main) {
  main();
}
