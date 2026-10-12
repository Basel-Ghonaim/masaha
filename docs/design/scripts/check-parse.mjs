// Parse every prototype source the way the browser will.
//
// docs/design/ is outside ESLint and Prettier and no test lane owns it, so a syntax error is
// found only when a page renders blank. This runs the Babel the pages vendor over every .jsx
// module and every inline <script type="text/babel"> block of every page.
//
//   node docs/design/scripts/check-parse.mjs
//
// It sees syntax only: a page that parses can still fail at runtime, or draw a block twice.

import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'prototype');

// The vendored Babel is a UMD build. The repository's `"type": "module"` makes Node load it as an
// ES module, where it finds no `exports` and no `define`, so it sets `globalThis.Babel` itself.
createRequire(import.meta.url)(join(ROOT, '_vendor', 'babel.min.js'));
const { Babel } = globalThis;

const pieces = [];
for (const file of readdirSync(join(ROOT, 'masaha')).filter((f) => f.endsWith('.jsx'))) {
  pieces.push({ label: `masaha/${file}`, code: readFileSync(join(ROOT, 'masaha', file), 'utf8') });
}
const files = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
for (const file of files) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  // Only the inline blocks: a block with src= is one of the modules above.
  for (const m of text.matchAll(/<script\b([^>]*type=["']text\/babel["'][^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/.test(m[1])) continue;
    const line = text.slice(0, m.index).split('\n').length;
    pieces.push({ label: `${file} (inline, line ${line})`, code: m[2] });
  }
}

let failures = 0;
for (const { label, code } of pieces) {
  try {
    Babel.transform(code, { presets: ['react'], filename: label, sourceType: 'script' });
  } catch (error) {
    failures++;
    console.error(`FAIL ${label}\n     ${error.message.split('\n')[0]}`);
  }
}

console.log(`${pieces.length - failures}/${pieces.length} blocks parsed, from ${files.length} pages and the modules`);
process.exitCode = failures ? 1 : 0;
