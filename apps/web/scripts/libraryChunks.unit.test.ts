import { describe, expect, it } from 'vitest';
import { LIBRARY_CHUNKS } from './libraryChunks';

/** The library chunks whose pattern holds a module, by its id (a path, with either slash). */
const chunksOf = (id: string) =>
  LIBRARY_CHUNKS.filter(({ test }) => test.test(id)).map(({ name }) => name);

describe("the library chunks' patterns", () => {
  it.each([
    [String.raw`C:\repo\node_modules\@tanstack\react-table\build\lib\index.mjs`, 'data-table'],
    ['/repo/node_modules/@tanstack/table-core/build/lib/index.mjs', 'data-table'],
    // The table's own store: left out, it lands in another chunk that the table's imports back.
    ['/repo/node_modules/@tanstack/store/dist/esm/index.js', 'data-table'],
    ['/repo/node_modules/@tanstack/react-store/dist/esm/index.js', 'data-table'],
    ['/repo/node_modules/use-sync-external-store/shim/with-selector.js', 'data-table'],
  ])('place %s in one library chunk', (id, chunk) => {
    expect(chunksOf(id)).toEqual([chunk]);
  });

  it.each([
    '/repo/node_modules/@tanstack/react-query/build/modern/index.js',
    '/repo/node_modules/react/index.js',
    '/repo/apps/web/src/shared/design-system/components/data/DataTable/DataTable.tsx',
  ])('leave %s to the other chunks', (id) => {
    expect(chunksOf(id)).toEqual([]);
  });
});
