import { describe, expect, it } from 'vitest';

/** The part of Node's file system this test reads with; the web's types know no Node. */
type FileSystem = { readFileSync: (path: URL, encoding: 'utf8') => string };

// Read from the disk: the unit lane empties a stylesheet imported outside the tokens (vite.config.ts),
// and runs in Node, which hands its file system over by name.
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule: (id: 'node:fs') => FileSystem } }
).process.getBuiltinModule('node:fs');
const leafletCss = readFileSync(new URL('./leaflet.css', import.meta.url), 'utf8').replaceAll(
  '\r\n',
  '\n',
);

/** The declarations of the rule whose selector is exactly `selector`. */
function rule(selector: string): string | undefined {
  const start = leafletCss.indexOf(`\n${selector} {`);
  if (start === -1) return undefined;
  const open = leafletCss.indexOf('{', start);
  return leafletCss.slice(open + 1, leafletCss.indexOf('}', open));
}

describe('leaflet.css', () => {
  // OpenStreetMap's tiles are light in both themes: a mark is drawn on a span that takes the light
  // theme (data-theme="light"), so its tone must resolve there, not on Leaflet's element (finding 135).
  it.each([
    ['success', 'var(--success)'],
    ['warning', 'var(--warning)'],
  ])('resolves the %s tone on the mark’s own span, where the light theme holds', (tone, value) => {
    expect(rule(`.map-tone-${tone} span`)).toContain(`--map-tone: ${value}`);
    expect(rule(`.map-tone-${tone}`)).toBeUndefined();
  });

  it('resolves the muted tones on the mark’s own span too', () => {
    expect(rule('.map-tone-neutral span,\n.map-tone-muted span')).toContain(
      '--map-tone: var(--muted-foreground)',
    );
  });
});
