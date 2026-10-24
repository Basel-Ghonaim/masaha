import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

export type ConflictHit = { file: string; line: number; marker: string };

const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
]);

function isBinary(path: string): boolean {
  return BINARY_EXTS.has(extname(path).toLowerCase());
}

export function findConflictMarkers(text: string): ConflictHit[] {
  const hits: ConflictHit[] = [];
  let inConflict = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const line = raw.replace(/\r$/, '');
    if (line.startsWith('<<<<<<< ')) {
      inConflict = true;
      hits.push({ file: '', line: i + 1, marker: '<<<<<<<' });
    } else if (line.startsWith('>>>>>>> ')) {
      inConflict = false;
      hits.push({ file: '', line: i + 1, marker: '>>>>>>>' });
    } else if (line.startsWith('||||||| ')) {
      hits.push({ file: '', line: i + 1, marker: '|||||||' });
    } else if (line === '=======' && inConflict) {
      hits.push({ file: '', line: i + 1, marker: '=======' });
    }
  }
  return hits;
}

function main(): void {
  const lsFiles = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n');
  const allHits: ConflictHit[] = [];

  for (const file of lsFiles) {
    if (isBinary(file)) continue;
    try {
      const content = readFileSync(file, 'utf8');
      const hits = findConflictMarkers(content);
      for (const hit of hits) {
        hit.file = file;
        allHits.push(hit);
      }
    } catch {
      // Skip unreadable files
    }
  }

  for (const hit of allHits) {
    console.error(`${hit.file}:${String(hit.line)}  ${hit.marker}`);
  }
  if (allHits.length > 0) {
    console.error(
      `\n${String(allHits.length)} conflict marker(s) found in ${String(new Set(allHits.map((h) => h.file)).size)} file(s).`,
    );
    process.exitCode = 1;
  } else {
    console.log('No conflict markers found.');
  }
}

if (import.meta.main) {
  main();
}
