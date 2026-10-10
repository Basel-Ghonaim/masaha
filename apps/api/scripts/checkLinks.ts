import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, posix } from 'node:path';

// Every relative link, image path and #anchor of the repository's Markdown files must resolve, and so
// must each document path cited in a source file (docs/architecture/documentation.md §8). Paths are
// compared with the real entries of the repository, case included, so a link that only a
// case-insensitive disk resolves (Windows) fails here as it would on GitHub. External links are not
// checked. A heading is an anchor by GitHub's slug: inline markup dropped, lowercased, anything but
// letters, numbers, `_`, `-` and spaces removed, spaces to `-`, a repeated heading `-1`, `-2`.

export type LinkProblem = { file: string; line: number; link: string; reason: string };

export type LinkInput = {
  // Scanned Markdown files, by repository-relative path with `/`.
  markdown: Record<string, string>;
  // Other files that may cite a document path in a comment.
  sources: Record<string, string>;
  // Every file and folder of the repository, by the same paths.
  entries: ReadonlySet<string>;
};

const blank = (text: string) => text.replace(/[^\n]/g, ' ');

// Blanks fenced code, keeping every offset and line.
function maskFences(text: string): string {
  let fence: { character: string; length: number } | undefined;
  return text
    .split('\n')
    .map((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        const closes =
          marker !== undefined &&
          marker.startsWith(fence.character) &&
          marker.length >= fence.length &&
          line.trim() === marker;
        if (closes) fence = undefined;
        return blank(line);
      }
      if (marker !== undefined) {
        fence = { character: marker.charAt(0), length: marker.length };
        return blank(line);
      }
      return line;
    })
    .join('\n');
}

const maskInlineCode = (text: string) =>
  text.replace(/(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, (span) => blank(span));

export function slugOf(heading: string): string {
  return heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*]/g, '')
    .replace(/(^|[^\p{L}\p{N}])_(.+?)_(?![\p{L}\p{N}])/gu, '$1$2')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '')
    .replaceAll(' ', '-');
}

function anchorsOf(text: string): Set<string> {
  const seen = new Map<string, number>();
  const anchors = new Set<string>();
  for (const line of maskFences(text).split('\n')) {
    const heading = /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line)?.[1];
    if (heading === undefined) continue;
    const slug = slugOf(heading);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${String(count)}`);
  }
  return anchors;
}

type Target = { link: string; offset: number };

function targetsIn(masked: string): Target[] {
  const targets: Target[] = [];
  // Every `](` opens a link target, so an image inside a link text is found as well.
  for (const match of masked.matchAll(/\]\(\s*(?:<([^>\n]*)>|([^)\s]*))/g)) {
    const link = match[1] ?? match[2];
    if (link) targets.push({ link, offset: match.index });
  }
  for (const match of masked.matchAll(/\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const link = match[1] ?? match[2];
    if (link) targets.push({ link, offset: match.index });
  }
  for (const match of masked.matchAll(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    for (const candidate of (match[1] ?? match[2] ?? '').split(',')) {
      const link = candidate.trim().split(/\s+/)[0];
      if (link) targets.push({ link, offset: match.index });
    }
  }
  return targets.sort((first, second) => first.offset - second.offset);
}

const lineAt = (text: string, offset: number) => text.slice(0, offset).split('\n').length;
const isExternal = (link: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link);

function decode(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

export function checkLinks({ markdown, sources, entries }: LinkInput) {
  const problems: LinkProblem[] = [];
  const anchors = new Map<string, Set<string>>();
  const anchorsFor = (file: string) => {
    const text = markdown[file];
    if (text === undefined) return undefined;
    const known = anchors.get(file) ?? anchorsOf(text);
    anchors.set(file, known);
    return known;
  };

  // Where `path` (written in `file`) lands, or undefined when it climbs out of the repository.
  const resolve = (file: string, path: string) => {
    const joined = path.startsWith('/')
      ? posix.normalize(path.slice(1))
      : posix.normalize(posix.join(posix.dirname(file), path));
    if (joined === '..' || joined.startsWith('../')) return undefined;
    return joined === '.' ? '' : joined.replace(/\/$/, '');
  };

  const verify = (
    file: string,
    line: number,
    link: string,
    target: string | undefined,
    anchor: string,
  ) => {
    if (target === undefined || (target !== '' && !entries.has(target))) {
      problems.push({ file, line, link, reason: 'no such file or folder' });
      return;
    }
    const known = anchor === '' || !target.endsWith('.md') ? undefined : anchorsFor(target);
    if (known && !known.has(anchor.toLowerCase())) {
      problems.push({ file, line, link, reason: 'no such heading' });
    }
  };

  let links = 0;
  for (const [file, text] of Object.entries(markdown)) {
    const masked = maskInlineCode(maskFences(text));
    for (const { link, offset } of targetsIn(masked)) {
      if (isExternal(link)) continue;
      links += 1;
      const [beforeAnchor = '', anchor = ''] = decode(link).split('#', 2);
      const path = beforeAnchor.split('?')[0] ?? '';
      verify(file, lineAt(text, offset), link, path === '' ? file : resolve(file, path), anchor);
    }
  }

  for (const [file, text] of Object.entries(sources)) {
    const citation = /(?<![\w/.-])(docs\/[\w./-]+?\.md)(?:#([\w-]+))?/g;
    for (const match of text.matchAll(citation)) {
      links += 1;
      // A citation names a path from the repository's root.
      verify(file, lineAt(text, match.index), match[0], match[1], match[2] ?? '');
    }
  }

  return { problems, links };
}

// ---- the walk: only main() reads the disk ----

const NOT_ENTRIES = new Set(['.git', 'node_modules', 'dist']);
// Entries (links may point into them) that are not scanned for links.
const NOT_SCANNED = ['.design-sync/', 'docs/design/prototype/'];
// Folders whose files may cite a document path, and what in them is generated or this check's own.
const SOURCE_ROOTS = ['apps/', 'packages/'];
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.sql',
  '.prisma',
  '.html',
]);
const NOT_SOURCES = ['/generated/', 'apps/api/scripts/checkLinks'];

function walk(root: string, folder = ''): string[] {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    if (NOT_ENTRIES.has(entry.name)) return [];
    const path = folder === '' ? entry.name : `${folder}/${entry.name}`;
    return entry.isDirectory() ? [path, ...walk(root, path)] : [path];
  });
}

function main() {
  const root = join(import.meta.dirname, '..', '..', '..');
  const paths = walk(root);
  const read = (path: string) => readFileSync(join(root, path), 'utf8');

  const markdown = Object.fromEntries(
    paths
      .filter(
        (path) => path.endsWith('.md') && !NOT_SCANNED.some((prefix) => path.startsWith(prefix)),
      )
      .map((path) => [path, read(path)]),
  );
  const sources = Object.fromEntries(
    paths
      .filter(
        (path) =>
          SOURCE_ROOTS.some((prefix) => path.startsWith(prefix)) &&
          SOURCE_EXTENSIONS.has(extname(path)) &&
          !NOT_SOURCES.some((part) => path.includes(part)),
      )
      .map((path) => [path, read(path)]),
  );

  const { problems, links } = checkLinks({ markdown, sources, entries: new Set(paths) });
  for (const problem of problems) {
    console.error(`${problem.file}:${String(problem.line)}  ${problem.link}  (${problem.reason})`);
  }
  if (problems.length > 0) {
    console.error(`\n${String(problems.length)} broken link(s) of ${String(links)} checked.`);
    process.exitCode = 1;
  } else {
    console.log(
      `${String(links)} links in ${String(Object.keys(markdown).length)} documents and ${String(Object.keys(sources).length)} source files all resolve.`,
    );
  }
}

if (import.meta.main) {
  main();
}
