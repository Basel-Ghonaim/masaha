// Find the classes the prototype uses that no stylesheet defines.
//
// The design system's CSS in prototype/_ds/ is prebuilt: it holds only the utility classes the
// original prototype used, so a class added by hand can do nothing at all, silently. This reads
// every class written in a page or a module and looks for it in the vendored stylesheets,
// masaha/masaha.css and the pages' own <style> blocks.
//
//   node docs/design/scripts/check-classes.mjs
//
// It fails on a dead class that KNOWN below does not list for that file. It reads only the class
// names written literally in `class="…"` or `className="…"`: a class chosen in a condition
// (`a ? 'x' : 'y'`), built by `cn(…)`, passed in another prop (`contentClassName`) or named as an
// object key is not seen, and a defined class can still be the wrong one.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'prototype');

// Dead before these scripts existed, by file: each is reported, none fails the check, and the same
// class used anywhere else does. Five are fix 1's DI-9 outside the space editor; `wm-a` and
// `wm-word` mark the Wordmark's option A, the plain word, which has no style.
const KNOWN = {
  'Customer file.html': ['-mt-3'],
  'Admin overview.html': ['hover:opacity-90'],
  'Customers.html': ['md:w-44'],
  'Wordmark.html': ['wm-a', 'wm-word'],
};
const known = (file, c) => (KNOWN[file] || []).includes(c);

const read = (path) => readFileSync(path, 'utf8');
const ds = readdirSync(join(ROOT, '_ds')).map((d) => join(ROOT, '_ds', d));
const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => join(ROOT, f));
const modules = readdirSync(join(ROOT, 'masaha')).filter((f) => f.endsWith('.jsx')).map((f) => join(ROOT, 'masaha', f));

const css = [
  ...ds.flatMap((d) => ['_ds_bundle.css', 'styles.css'].map((f) => read(join(d, f)))),
  read(join(ROOT, 'masaha', 'masaha.css')),
  ...pages.flatMap((p) => [...read(p).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])),
].join('\n');

// Every class selector, unescaped: `.md\:hidden` is the class `md:hidden`.
const defined = new Set([...css.matchAll(/\.((?:[\w-]|\\[^\s])+)/g)].map((m) => m[1].replace(/\\(.)/g, '$1')));

const used = new Map();
for (const file of [...pages, ...modules]) {
  const text = read(file);
  const values = [
    ...[...text.matchAll(/(?:className|class)\s*=\s*"([^"]*)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:className|class)\s*=\s*\{?[`']([^`']*)[`']/g)].map((m) => m[1]),
  ];
  for (const value of values) {
    for (const token of value.split(/\s+/)) {
      if (!token || token.includes('{') || token.includes('$')) continue;
      if (!used.has(token)) used.set(token, new Set());
      used.get(token).add(file.slice(ROOT.length + 1).replace(/\\/g, '/'));
    }
  }
}

const dead = [...used.keys()].filter((c) => !defined.has(c)).sort().flatMap((c) => [...used.get(c)].map((file) => [file, c]));
const fresh = dead.filter(([file, c]) => !known(file, c));
for (const [file, c] of dead) console.log(`${known(file, c) ? 'known' : 'DEAD '} ${c.padEnd(28)} ${file}`);
for (const [file, list] of Object.entries(KNOWN)) {
  for (const c of list) if (!(used.get(c) || new Set()).has(file)) console.log(`gone  ${c} in ${file} (no longer used: drop it from KNOWN)`);
}

console.log(`${used.size} classes used, ${dead.length} dead uses, ${fresh.length} new`);
process.exitCode = fresh.length ? 1 : 0;
