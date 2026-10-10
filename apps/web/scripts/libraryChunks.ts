// The heavy libraries only some pages use, each built into a chunk of its own, named here:
// vite.config.ts makes the chunks, and check:build refuses each of them in the site's first download
// (finding 45). The one list both read.

/** A library's chunk: its name in the build, and the modules it holds, by their path. */
type LibraryChunk = { name: string; test: RegExp };

export const LIBRARY_CHUNKS: readonly LibraryChunk[] = [
  // TanStack Table, under the design system's DataTable, with the store and the React shim only it
  // uses: a dependency left out of the group lands in another chunk, which then imports the table's
  // chunk back. Should the site come to use one of them, check:build fails rather than letting it by.
  {
    name: 'data-table',
    test: /[\\/]node_modules[\\/](?:@tanstack[\\/](?:react-table|table-core|react-store|store)|use-sync-external-store)[\\/]/,
  },
];
