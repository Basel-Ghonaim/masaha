import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The browser's icons and its bar's colour (docs/frontend/design-system/foundation.md §16). The
// browser draws them outside the page, where no token reaches, so they carry the identity's values
// themselves (ADR 0019): the colours below are written here by hand, never read from the tokens.
const WEB = join(import.meta.dirname, '..');
const PUBLIC = join(WEB, 'public');
const indexHtml = readFileSync(join(WEB, 'index.html'), 'utf8');

/** Each `<name …>` tag of `html`, as its attributes. */
function tags(html: string, name: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'g'))].map(([, attributes = '']) =>
    Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(
        ([, key = '', value = '']): [string, string] => [key, value],
      ),
    ),
  );
}

/** The fill each of the classes `.ink` and `.spark` takes in `css`, lowercased. */
function fills(css: string): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/\.(ink|spark)\s*\{\s*fill:\s*(#[0-9a-f]{6})\s*;?\s*\}/gi)].map(
      ([, name = '', colour = '']): [string, string] => [name, colour.toLowerCase()],
    ),
  );
}

/** A PNG's width and height, read from its IHDR chunk, which follows the 8-byte signature. */
function pngSize(png: Buffer): { width: number; height: number } {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(png.toString('latin1', 12, 16)).toBe('IHDR');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const publicFile = (name: string) => readFileSync(join(PUBLIC, name));

describe("the browser's icons", () => {
  it('index.html links the .ico, then the SVG, and the home-screen icon, each a file of public/', () => {
    const icons = tags(indexHtml, 'link').filter(
      ({ rel }) => rel === 'icon' || rel === 'apple-touch-icon',
    );

    expect(icons).toEqual([
      { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ]);
    for (const { href } of icons) {
      expect(existsSync(join(PUBLIC, href ?? '')), `public${href ?? ''}`).toBe(true);
    }
  });

  it("index.html colours the browser's bar with the background, #f7fbff light and #0d1217 dark", () => {
    expect(tags(indexHtml, 'meta').filter(({ name }) => name === 'theme-color')).toEqual([
      { name: 'theme-color', content: '#f7fbff', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#0d1217', media: '(prefers-color-scheme: dark)' },
    ]);
  });

  it("the SVG favicon draws ink #1a1f25 and spark #b55bb3, and #f7fbff and #d27ed0 under the browser's dark scheme", () => {
    const svg = publicFile('favicon.svg').toString('utf8');
    const style = /<style>([\s\S]*?)<\/style>/.exec(svg)?.[1] ?? '';
    const [light = '', dark = ''] = style.split(
      /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/,
    );

    expect(fills(light)).toEqual({ ink: '#1a1f25', spark: '#b55bb3' });
    expect(fills(dark)).toEqual({ ink: '#f7fbff', spark: '#d27ed0' });
    // No colour but these four anywhere in the file: no background, no fill of its own.
    expect(new Set(svg.toLowerCase().match(/#[0-9a-f]{3,8}\b/g))).toEqual(
      new Set(['#1a1f25', '#b55bb3', '#f7fbff', '#d27ed0']),
    );
  });

  it('draws every shape of the SVG favicon with its class: the words ink, the dots spark (R2-F1 of #144)', () => {
    const svg = publicFile('favicon.svg').toString('utf8');
    // What is drawn: every shape outside <defs>, which only holds the clips and the words' path.
    const drawn = svg.replace(/<defs>[\s\S]*?<\/defs>/, '');
    const shapes = [...drawn.matchAll(/<(use|path|rect|circle|polygon|ellipse)\b[^>]*>/g)].map(
      ([tag = '', name = '']) => ({ name, className: /\sclass="([^"]*)"/.exec(tag)?.[1] ?? null }),
    );

    expect(shapes).toEqual([
      { name: 'use', className: 'ink' },
      { name: 'use', className: 'ink' },
      { name: 'path', className: 'spark' },
    ]);
  });

  it('the home-screen icon is a 180 × 180 PNG', () => {
    expect(pngSize(publicFile('apple-touch-icon.png'))).toEqual({ width: 180, height: 180 });
  });

  it('the .ico holds 16, 32 and 48 px images in its directory, each a PNG of that size', () => {
    const ico = publicFile('favicon.ico');
    // ICONDIR: reserved 0, type 1 (an icon), the count; then a 16-byte ICONDIRENTRY per image.
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    const entries = Array.from({ length: ico.readUInt16LE(4) }, (_, index) => {
      const entry = 6 + index * 16;
      const size = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      return {
        width: ico.readUInt8(entry),
        height: ico.readUInt8(entry + 1),
        png: pngSize(ico.subarray(offset, offset + size)),
      };
    });

    expect(entries).toEqual(
      [16, 32, 48].map((px) => ({ width: px, height: px, png: { width: px, height: px } })),
    );
  });
});
