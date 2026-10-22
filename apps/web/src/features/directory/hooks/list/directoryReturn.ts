// The directory's last address (its filters, order, page and view), in the feature's memory only,
// never in storage: what a space's page links back to.
let lastSearch = '';

/** Keeps the directory's address as it now stands (`?…`, or empty). */
export function rememberDirectorySearch(search: string): void {
  lastSearch = search;
}

/**
 * The directory's last address, for a link back to it with its search, filters and page kept: empty
 * until the directory has been seen in this visit.
 */
export function useDirectoryReturn(): string {
  return lastSearch;
}
